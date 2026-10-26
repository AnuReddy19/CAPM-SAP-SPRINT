import cds from '@sap/cds';

const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;
const DAY_MS = 24 * 60 * 60 * 1000;
const TAX_RATE = 0.18;

export default cds.service.impl(async function () {
  const {
    ClientSrv, EmployeeSrv, ProjectSrv, BudgetSrv, MilestoneSrv, TaskSrv,
    TimesheetSrv, TimesheetEntrySrv, ApprovalSrv, InvoiceSrv, AlertSrv
  } = this.entities;

  const txFor = req => cds.tx(req);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const toISO = value => value ? new Date(value).toISOString().slice(0, 10) : null;
  const dateObj = value => new Date(`${toISO(value)}T00:00:00.000Z`);
  const addDays = (value, days) => {
    const d = dateObj(value);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const mondayOf = value => {
    const d = dateObj(value || todayISO());
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  const round2 = value =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const sum = (rows, field) =>
    round2((rows || []).reduce((n, row) => n + Number(row[field] || 0), 0));

  const fail = (message, status = 400) => {
    const e = new Error(message);
    e.status = status;
    throw e;
  };

  const required = (value, label) => {
    if (value === undefined || value === null || value === '') {
      fail(`${label} is required.`);
    }
    return value;
  };

const hasRole = (req, role) => {
  if (!req.user) return false;

  if (typeof req.user.is === 'function' && req.user.is(role)) {
    return true;
  }

  const roles = req.user.roles;

  if (Array.isArray(roles)) {
    return roles.includes(role);
  }

  if (typeof roles === 'string') {
    return roles.split(/[,\s]+/).includes(role);
  }

  if (roles && typeof roles === 'object') {
    return Boolean(roles[role]);
  }

  return false;
};

const isAdmin = req => hasRole(req, 'PSA_Admin');

const isUser = req => hasRole(req, 'PSA_User');

const userEmail = req => {
    const candidates = [
        req.user?.attr?.email,
        req.user?.attr?.mail,
        req.user?.id
    ];

    const email = candidates
        .find(value =>
            typeof value === 'string' &&
            value.trim().includes('@')
        );

    return email ? email.trim().toLowerCase() : '';
};

  const userName = req =>
    String(
      req.user?.attr?.name ||
      req.user?.attr?.given_name ||
      req.user?.id ||
      ''
    );

const ensureAdmin = req => {
  // TEMPORARY: Authorization disabled while building the dashboard.
  // Restore the role check before deploying for real users.
  return;
};

  const ensureSignedIn = req => {
    if (!req.user || req.user.is('anonymous')) {
      fail('Please sign in to continue.', 401);
    }
  };

  async function getEmployeeForUser(req, tx = txFor(req)) {
    const email = userEmail(req);
    if (!email) return null;

    const employees = await tx.run(
      SELECT.from(EmployeeSrv)
        .columns(
          'NODE_KEY', 'FIRST_NAME', 'LAST_NAME',
          'EMAIL', 'IS_ACTIVE', 'IS_MANAGER'
        )
        .where`lower(EMAIL) = ${email}`
    );

    return employees[0] || null;
  }

  async function employeeRequired(req, tx = txFor(req)) {
    const employee = await getEmployeeForUser(req, tx);

    if (!employee) {
      fail('Your account is not linked with an employee.', 403);
    }

    if (employee.IS_ACTIVE === false) {
      fail('Inactive employees cannot record time.', 403);
    }

    return employee;
  }

  async function getOne(tx, entity, key, label = 'Record') {
    const row = await tx.run(
      SELECT.one.from(entity).where({ NODE_KEY: key })
    );

    if (!row) fail(`${label} was not found.`, 404);
    return row;
  }

  async function projectBudget(tx, projectID) {
    return tx.run(
      SELECT.one.from(BudgetSrv)
        .where({ PROJECT_NODE_KEY: projectID })
    ).catch(() => null);
  }

  async function maintainAlerts(tx, projectID, percent, taskID) {
    for (const threshold of [75, 90, 100]) {
      if (percent < threshold) continue;

      const where = taskID
        ? { TASK_NODE_KEY: taskID, THRESHOLD: threshold }
        : {
            PROJECT_NODE_KEY: projectID,
            THRESHOLD: threshold,
            TASK_NODE_KEY: null
          };

      const existing = await tx.run(
        SELECT.one.from(AlertSrv).where(where)
      );

      if (!existing) {
        await tx.run(
          INSERT.into(AlertSrv).entries({
            THRESHOLD: threshold,
            CONSUMED_PERCENT: round2(percent),
            MESSAGE:
              `${taskID ? 'Task' : 'Project'} budget consumption reached ${threshold}%.`,
            PROJECT: { NODE_KEY: projectID },
            ...(taskID ? { TASK: { NODE_KEY: taskID } } : {})
          })
        );
      }
    }
  }

  async function refreshProjectRollups(tx, projectID) {
    const project = await getOne(
      tx, ProjectSrv, projectID, 'Project'
    );

    const budget = await projectBudget(tx, projectID);

    const tasks = await tx.run(
      SELECT.from(TaskSrv)
        .where({ 'MILESTONE.PROJECT_NODE_KEY': projectID })
    );

    const approvedSheets = await tx.run(
      SELECT.from(TimesheetSrv)
        .where({ STATUS: { in: ['Approved', 'Invoiced'] } })
    );

    const sheetIDs = approvedSheets.map(s => s.NODE_KEY);

    const entries = sheetIDs.length
      ? await tx.run(
          SELECT.from(TimesheetEntrySrv)
            .where({ PARENT_NODE_KEY: { in: sheetIDs } })
        )
      : [];

    const projectTasks = new Set(tasks.map(t => t.NODE_KEY));

    const projectEntries = entries.filter(
      entry => entry.TASK_NODE_KEY &&
        projectTasks.has(entry.TASK_NODE_KEY)
    );

    const consumedHours = sum(projectEntries, 'HOURS');

    await tx.run(
      UPDATE(ProjectSrv)
        .set({ CONSUMED_HOURS: consumedHours })
        .where({ NODE_KEY: projectID })
    );

    for (const task of tasks) {
      const actual = sum(
        projectEntries.filter(
          entry => entry.TASK_NODE_KEY === task.NODE_KEY
        ),
        'HOURS'
      );

      const estimated = Number(task.ESTIMATED_HOURS || 0);
      const burn = estimated > 0
        ? round2((actual / estimated) * 100)
        : 0;

      await tx.run(
        UPDATE(TaskSrv)
          .set({
            ACTUAL_HOURS: actual,
            BURN_PERCENT: burn
          })
          .where({ NODE_KEY: task.NODE_KEY })
      );
    }

    const milestones = await tx.run(
      SELECT.from(MilestoneSrv)
        .where({ PROJECT_NODE_KEY: projectID })
    );

    for (const milestone of milestones) {
      const milestoneTasks = tasks.filter(
        task => task.MILESTONE_NODE_KEY === milestone.NODE_KEY
      );

      const done = milestoneTasks.filter(
        task => task.STATUS === 'Done'
      ).length;

      const pct = milestoneTasks.length
        ? round2(done * 100 / milestoneTasks.length)
        : 0;

      await tx.run(
        UPDATE(MilestoneSrv)
          .set({ COMPLETION_PERCENT: pct })
          .where({ NODE_KEY: milestone.NODE_KEY })
      );
    }

    if (budget) {
      const billableHours = sum(
        projectEntries.filter(entry => entry.IS_BILLABLE),
        'HOURS'
      );

      const consumedAmount = round2(
        billableHours * Number(budget.BILLING_RATE || 0)
      );

      const amount = Number(budget.BUDGET_AMOUNT || 0);
      const remaining = round2(amount - consumedAmount);
      const pct = amount > 0
        ? round2(consumedAmount * 100 / amount)
        : 0;

      const status = pct > 100
        ? 'Breached'
        : pct >= 80
          ? 'At Risk'
          : 'Within Budget';

      await tx.run(
        UPDATE(BudgetSrv)
          .set({
            CONSUMED_AMOUNT: consumedAmount,
            REMAINING_AMOUNT: remaining,
            CONSUMED_PERCENT: pct,
            BUDGET_STATUS: status
          })
          .where({ NODE_KEY: budget.NODE_KEY })
      );

      await maintainAlerts(tx, projectID, pct, null);
    }

    return `Project ${project.PROJECT_CODE} rollups recalculated.`;
  }

  async function validateProjectDates(
    tx, projectID, start, end
  ) {
    if (start && end && toISO(end) < toISO(start)) {
      fail('Project end date cannot be before its start date.');
    }

    if (projectID) {
      const project = await getOne(
        tx, ProjectSrv, projectID, 'Project'
      );

      if (
        start && project.START_DATE &&
        toISO(start) < toISO(project.START_DATE)
      ) {
        fail('Milestone dates must be within the project date range.');
      }

      if (
        end && project.END_DATE &&
        toISO(end) > toISO(project.END_DATE)
      ) {
        fail('Milestone dates must be within the project date range.');
      }
    }
  }

  async function validateAndCreateTimesheet(
    req, employee, weekStart, entriesInput, tx
  ) {
    const start = mondayOf(weekStart || todayISO());
    const end = addDays(start, 6);

    const duplicate = await tx.run(
      SELECT.one.from(TimesheetSrv).where({
        EMPLOYEE_NODE_KEY: employee.NODE_KEY,
        WEEK_START: start
      })
    );

    if (duplicate) {
      fail('A timesheet already exists for this employee and week.');
    }

    const [sheet] = await tx.run(
      INSERT.into(TimesheetSrv).entries({
        WEEK_START: start,
        WEEK_END: end,
        TOTAL_HOURS: 0,
        STATUS: 'Draft',
        EMPLOYEE: { NODE_KEY: employee.NODE_KEY }
      }).returning('*')
    );

    const rows = Array.isArray(entriesInput) ? entriesInput : [];
    const seen = new Set();
    const daily = {};
    let total = 0;

    for (const item of rows) {
      const workDate = toISO(item.WORK_DATE || start);
      const hours = Number(item.HOURS ?? 8);
      const taskID = required(item.TASK_ID, 'Task');

      if (workDate < start || workDate > end) {
        fail('Each entry date must be within the timesheet week.');
      }

      if (!Number.isFinite(hours) || hours < 0.25 || hours > 24) {
        fail('Entry hours must be between 0.25 and 24.');
      }

      const task = await getOne(
    tx,
    TaskSrv,
    taskID,
    "Task"
);

if (task.ASSIGNEE_NODE_KEY !== employee.NODE_KEY) {
    fail(
        "You can only record time against tasks assigned to this employee.",
        403
    );
}

if (task.STATUS === "Done") {
    fail("Time cannot be booked against a completed task.");
}

      const duplicateKey = `${workDate}|${taskID}`;

      if (seen.has(duplicateKey)) {
        fail('Duplicate task entries on the same day are not allowed.');
      }

      seen.add(duplicateKey);
      daily[workDate] = (daily[workDate] || 0) + hours;

      if (daily[workDate] > 24) {
        fail('Total hours for a day cannot exceed 24.');
      }

      total += hours;

      await tx.run(
        INSERT.into(TimesheetEntrySrv).entries({
          WORK_DATE: workDate,
          HOURS: hours,
          IS_BILLABLE: item.IS_BILLABLE ?? true,
          NOTES: item.NOTES || '',
          PARENT: { NODE_KEY: sheet.NODE_KEY },
          TASK: { NODE_KEY: taskID }
        })
      );
    }

    await tx.run(
      UPDATE(TimesheetSrv)
        .set({ TOTAL_HOURS: round2(total) })
        .where({ NODE_KEY: sheet.NODE_KEY })
    );

    return {
      ...sheet,
      WEEK_START: start,
      WEEK_END: end,
      TOTAL_HOURS: round2(total),
      STATUS: 'Draft'
    };
  }

  async function validateTimesheetEntries(req, sheet, tx) {
    const entries = await tx.run(
      SELECT.from(TimesheetEntrySrv)
        .where({ PARENT_NODE_KEY: sheet.NODE_KEY })
    );

    if (!entries.length) {
      fail('Add at least one time entry before submitting.');
    }

    const start = toISO(sheet.WEEK_START);
    const end = toISO(sheet.WEEK_END);
    const seen = new Set();
    const daily = {};

    for (const entry of entries) {
      const day = toISO(entry.WORK_DATE);

      if (day < start || day > end) {
        fail('Each entry date must be within the timesheet week.');
      }

      const hours = Number(entry.HOURS);

      if (hours < 0.25 || hours > 24) {
        fail('Entry hours must be between 0.25 and 24.');
      }

      const key = `${day}|${entry.TASK_NODE_KEY}`;

      if (seen.has(key)) {
        fail('Duplicate task entries on the same day are not allowed.');
      }

      seen.add(key);
      daily[day] = (daily[day] || 0) + hours;

      if (daily[day] > 24) {
        fail('Total hours for a day cannot exceed 24.');
      }

      const task = await getOne(
        tx, TaskSrv, entry.TASK_NODE_KEY, 'Task'
      );

      if (task.STATUS === 'Done') {
        fail('Time cannot be booked against a completed task.');
      }
    }

    await tx.run(
      UPDATE(TimesheetSrv)
        .set({ TOTAL_HOURS: sum(entries, 'HOURS') })
        .where({ NODE_KEY: sheet.NODE_KEY })
    );

    return entries;
  }

  async function createInvoice(
    req, projectID, periodFrom, periodTo, tx
  ) {
    ensureAdmin(req);

    required(projectID, 'Project');
    required(periodFrom, 'Period start');
    required(periodTo, 'Period end');

    const from = toISO(periodFrom);
    const to = toISO(periodTo);

    if (to < from) {
      fail('Invoice period end cannot be before its start date.');
    }

    const project = await getOne(
      tx, ProjectSrv, projectID, 'Project'
    );

    const budget = await projectBudget(tx, projectID);

    if (!budget) {
      fail('Create a budget for this project before invoicing.');
    }

    const priorInvoices = await tx.run(
      SELECT.from(InvoiceSrv).where({
        PROJECT_NODE_KEY: projectID,
        PERIOD_FROM: { '<=': to },
        PERIOD_TO: { '>=': from },
        STATUS: { '!=': 'Draft' }
      })
    );

    if (
      project.BILLING_TYPE === 'Retainer' &&
      priorInvoices.length
    ) {
      fail('Retainer invoice periods cannot overlap.');
    }

    const sheets = await tx.run(
      SELECT.from(TimesheetSrv)
        .where({ STATUS: { in: ['Approved', 'Invoiced'] } })
    );

    const approvedIDs = sheets.map(sheet => sheet.NODE_KEY);

    if (!approvedIDs.length) {
      fail('No approved billable time is available for this period.');
    }

    const allEntries = await tx.run(
      SELECT.from(TimesheetEntrySrv).where({
        PARENT_NODE_KEY: { in: approvedIDs },
        WORK_DATE: { between: from, and: to },
        IS_BILLABLE: true
      })
    );

    const projectTasks = await tx.run(
      SELECT.from(TaskSrv)
        .where({ 'MILESTONE.PROJECT_NODE_KEY': projectID })
    );

    const taskIDs = new Set(
      projectTasks.map(task => task.NODE_KEY)
    );

    const eligible = allEntries.filter(
      entry => taskIDs.has(entry.TASK_NODE_KEY) &&
        !entry.INVOICE_NODE_KEY
    );

    const hours = sum(eligible, 'HOURS');

    if (project.BILLING_TYPE !== 'Retainer' && hours <= 0) {
      fail('No unbilled approved billable hours are available for this period.');
    }

    const alreadyBilled = sum(
      await tx.run(
        SELECT.from(InvoiceSrv).where({
          PROJECT_NODE_KEY: projectID,
          STATUS: { in: ['Issued', 'Paid'] }
        })
      ),
      'NET_AMOUNT'
    );

    let net;

    if (project.BILLING_TYPE === 'Retainer') {
      net = Number(budget.RETAINER_FEE || 0);

      if (net <= 0) {
        fail('Retainer fee must be greater than zero.');
      }
    } else {
      net = round2(hours * Number(budget.BILLING_RATE || 0));

      if (project.BILLING_TYPE === 'Fixed') {
        const remaining = Math.max(
          0,
          Number(budget.BUDGET_AMOUNT || 0) - alreadyBilled
        );

        net = Math.min(net, remaining);

        if (net <= 0) {
          fail('The fixed-fee budget has already been fully billed.');
        }
      }
    }

    const tax = round2(net * TAX_RATE);
    const gross = round2(net + tax);
    const year = new Date(`${from}T00:00:00Z`).getUTCFullYear();
    const yearPrefix = `INV-${year}-`;

    const existing = await tx.run(
      SELECT.from(InvoiceSrv)
        .columns('INVOICE_NO')
        .where({ INVOICE_NO: { like: `${yearPrefix}%` } })
    );

    const nextNumber =
      existing.reduce(
        (max, row) => Math.max(
          max,
          Number(String(row.INVOICE_NO).slice(yearPrefix.length)) || 0
        ),
        0
      ) + 1;

    const invoiceNo =
      `${yearPrefix}${String(nextNumber).padStart(4, '0')}`;

    const [invoice] = await tx.run(
      INSERT.into(InvoiceSrv).entries({
        INVOICE_NO: invoiceNo,
        PERIOD_FROM: from,
        PERIOD_TO: to,
        INVOICE_DATE: todayISO(),
        DUE_DATE: addDays(todayISO(), 30),
        BILLABLE_HOURS: hours,
        STATUS: 'Draft',
        NET_AMOUNT: net,
        TAX_AMOUNT: tax,
        GROSS_AMOUNT: gross,
        CURRENCY: budget.CURRENCY_CODE || 'INR',
        PROJECT: { NODE_KEY: projectID }
      }).returning('*')
    );

    for (const entry of eligible) {
      await tx.run(
        UPDATE(TimesheetEntrySrv)
          .set({ INVOICE: { NODE_KEY: invoice.NODE_KEY } })
          .where({ NODE_KEY: entry.NODE_KEY })
      );
    }

    return invoice;
  }
    // Calculated virtual fields used by Fiori Elements.
  this.after('READ', EmployeeSrv, rows => {
    for (const row of (Array.isArray(rows) ? rows : [rows])) {
      if (row) {
        row.fullName = [row.FIRST_NAME, row.LAST_NAME]
          .filter(Boolean)
          .join(' ');
      }
    }
  });

  this.after('READ', ProjectSrv, rows => {
    for (const row of (Array.isArray(rows) ? rows : [rows])) {
      if (row) {
        row.HOURS_PERCENT = Number(row.PLANNED_HOURS) > 0
          ? round2(
              Number(row.CONSUMED_HOURS || 0) * 100 /
              Number(row.PLANNED_HOURS)
            )
          : 0;
      }
    }
  });

  this.after('READ', BudgetSrv, rows => {
    for (const row of (Array.isArray(rows) ? rows : [rows])) {
      if (row) {
        row.CRITICALITY =
          Number(row.CONSUMED_PERCENT || 0) >= 100 ? 1 :
          Number(row.CONSUMED_PERCENT || 0) >= 80 ? 2 : 3;
      }
    }
  });


this.after('READ', TaskSrv, async (rows, req) => {
  const list = Array.isArray(rows) ? rows : [rows];
  const tx = txFor(req);

  for (const row of list) {
    if (!row) continue;

    row.CRITICALITY =
      Number(row.BURN_PERCENT || 0) >= 100 ? 1 :
      Number(row.BURN_PERCENT || 0) >= 80 ? 2 : 3;

    // Get the milestone key even when it was not selected by the client.
    let milestoneKey = row.MILESTONE_NODE_KEY;

    if (!milestoneKey && row.NODE_KEY) {
      const task = await tx.run(
      SELECT.one.from(TaskSrv)
      .columns('MILESTONE_NODE_KEY')
      .where({ NODE_KEY: row.NODE_KEY })
);

      milestoneKey = task?.MILESTONE_NODE_KEY;
    }

    if (!milestoneKey) {
      row.PROJECT_CODE = '';
      continue;
    }

    const milestone = await tx.run(
      SELECT.one.from(MilestoneSrv)
        .columns('PROJECT_NODE_KEY')
        .where({ NODE_KEY: milestoneKey })
    );

    if (!milestone?.PROJECT_NODE_KEY) {
      row.PROJECT_CODE = '';
      continue;
    }

    const project = await tx.run(
      SELECT.one.from(ProjectSrv)
        .columns('PROJECT_CODE')
        .where({ NODE_KEY: milestone.PROJECT_NODE_KEY })
    );

    row.PROJECT_CODE = project?.PROJECT_CODE || '';
  }
});


  this.after('READ', TimesheetSrv, rows => {
    for (const row of (Array.isArray(rows) ? rows : [rows])) {
      if (!row) continue;

      row.STATUS_CRITICALITY = ({
        Rejected: 1,
        Submitted: 2,
        Draft: 3,
        Approved: 3,
        Invoiced: 3
      })[row.STATUS] ?? 0;

      row.IS_LOCKED = !['Draft', 'Rejected'].includes(row.STATUS);
    }
  });

  this.after('READ', InvoiceSrv, rows => {
    const today = todayISO();

    for (const row of (Array.isArray(rows) ? rows : [rows])) {
      if (!row) continue;

      row.STATUS_CRITICALITY =
        row.STATUS === 'Issued' && toISO(row.DUE_DATE) < today ? 1 :
        row.STATUS === 'Issued' ? 2 :
        row.STATUS === 'Paid' ? 3 : 0;
    }
  });

  this.after('READ', AlertSrv, rows => {
    for (const row of (Array.isArray(rows) ? rows : [rows])) {
      if (!row) continue;

      row.CRITICALITY =
        Number(row.THRESHOLD || 0) >= 100 ? 1 :
        Number(row.THRESHOLD || 0) >= 90 ? 2 : 3;
    }
  });

  // Identity and dashboard.
  this.on('whoAmI', async req => {
    ensureSignedIn(req);

    const employee = await getEmployeeForUser(req);
    const roles = req.user?.roles || [];

    return {
      user: req.user?.id || '',
      name: userName(req),
      email: userEmail(req),
      origin: req.user?.attr?.origin || 'sap.default',
      isAdmin: isAdmin(req),
      isUser: isUser(req),
      scopes: roles,
      employeeID: employee?.NODE_KEY || null,
      message: employee
        ? ''
        : 'Your account is not linked with an employee.'
    };
  });


  this.on('kpis', async req => {
    ensureSignedIn(req);

    const tx = txFor(req);
    const employee = await getEmployeeForUser(req, tx);
    const today = todayISO();

    const result = {
      myOpenTimesheets: 0,
      pendingApprovals: null,
      atRiskBudgets: null,
      activeProjects: null,
      draftInvoices: null,
      unbilledHours: null,
      overdueInvoices: null,
      overdueAmount: null,
      clients: null,
      employees: null
    };

    // Every linked employee can see their own open timesheet count.
    if (employee) {
      const ownSheets = await tx.run(
        SELECT.from(TimesheetSrv).where({
          EMPLOYEE_NODE_KEY: employee.NODE_KEY,
          STATUS: { in: ['Draft', 'Rejected', 'Submitted'] }
        })
      );

      result.myOpenTimesheets = ownSheets.length;
    }

    // Admin receives organization-wide KPI totals.
    const admin = isAdmin(req);

    // A manager must be identified by role or employee profile.
    const manager =
      !admin &&
      (
        hasRole(req, 'PSA_Manager') ||
        employee?.IS_MANAGER === true
      );

    // Ordinary employees receive personal data only.
    if (!admin && !manager) {
      return result;
    }

    // Load the records needed for KPI calculations.
    const [
      allProjects,
      allBudgets,
      allEmployees,
      allSheets,
      allInvoices,
      allTasks,
      allMilestones,
      allClients
    ] = await Promise.all([
      tx.run(SELECT.from(ProjectSrv)),
      tx.run(SELECT.from(BudgetSrv)),
      tx.run(SELECT.from(EmployeeSrv)),
      tx.run(SELECT.from(TimesheetSrv)),
      tx.run(SELECT.from(InvoiceSrv)),
      tx.run(SELECT.from(TaskSrv)),
      tx.run(SELECT.from(MilestoneSrv)),
      tx.run(SELECT.from(ClientSrv))
    ]);

    let projects;
    let employees;
    let sheets;
    let budgets;
    let invoices;
    let clients;

    if (admin) {
      projects = allProjects;
      employees = allEmployees;
      sheets = allSheets;
      budgets = allBudgets;
      invoices = allInvoices;
      clients = allClients;
    } else {
      // Scope projects to the logged-in manager.
      projects = allProjects.filter(
        project =>
          project.MANAGER_NODE_KEY === employee.NODE_KEY
      );

      const projectIDs = new Set(
        projects.map(project => project.NODE_KEY)
      );

      // Employees reporting to this manager.
      employees = allEmployees.filter(
        person =>
          person.MANAGER_NODE_KEY === employee.NODE_KEY
      );

      const employeeIDs = new Set(
        employees.map(person => person.NODE_KEY)
      );

      const projectMilestones = allMilestones.filter(
        milestone =>
          projectIDs.has(milestone.PROJECT_NODE_KEY)
      );

      const milestoneIDs = new Set(
        projectMilestones.map(milestone => milestone.NODE_KEY)
      );

      const projectTasks = allTasks.filter(
        task =>
          milestoneIDs.has(task.MILESTONE_NODE_KEY)
      );

      const taskIDs = new Set(
        projectTasks.map(task => task.NODE_KEY)
      );

      // A submitted sheet is in scope if its employee reports
      // to this manager or one of its entries belongs to a task
      // on a project managed by this manager.
      const submittedSheets = allSheets.filter(
        sheet => sheet.STATUS === 'Submitted'
      );

      const submittedIDs = new Set(
        submittedSheets.map(sheet => sheet.NODE_KEY)
      );

      const submittedEntries = submittedIDs.size
        ? await tx.run(
            SELECT.from(TimesheetEntrySrv).where({
              PARENT_NODE_KEY: { in: [...submittedIDs] }
            })
          )
        : [];

      const sheetIDsWithProjectWork = new Set(
        submittedEntries
          .filter(entry => taskIDs.has(entry.TASK_NODE_KEY))
          .map(entry => entry.PARENT_NODE_KEY)
      );

      const permittedSheetIDs = new Set([
        ...submittedSheets
          .filter(sheet =>
            employeeIDs.has(sheet.EMPLOYEE_NODE_KEY)
          )
          .map(sheet => sheet.NODE_KEY),
        ...sheetIDsWithProjectWork
      ]);

      sheets = allSheets.filter(
        sheet => permittedSheetIDs.has(sheet.NODE_KEY)
      );

      budgets = allBudgets.filter(
        budget => projectIDs.has(budget.PROJECT_NODE_KEY)
      );

      invoices = allInvoices.filter(
        invoice => projectIDs.has(invoice.PROJECT_NODE_KEY)
      );

      const clientIDs = new Set(
        projects
          .map(project => project.CLIENT_NODE_KEY)
          .filter(Boolean)
      );

      clients = allClients.filter(
        client => clientIDs.has(client.NODE_KEY)
      );
    }

    const projectIDs = new Set(
      projects.map(project => project.NODE_KEY)
    );

    const scopedBudgets = budgets.filter(
      budget => projectIDs.has(budget.PROJECT_NODE_KEY)
    );

    const scopedProjects = projects.filter(
  project =>
    ['Active', 'IN_PROGRESS'].includes(project.PROJECT_STATUS) &&
    (!project.END_DATE || toISO(project.END_DATE) >= today)
);

    const pending = sheets.filter(
      sheet => sheet.STATUS === 'Submitted'
    );

    const atRisk = scopedBudgets.filter(
      budget =>
        ['At Risk', 'Breached'].includes(budget.BUDGET_STATUS)
    );

    const drafts = invoices.filter(
      invoice => invoice.STATUS === 'Draft'
    );

    const overdue = invoices.filter(
      invoice =>
        invoice.STATUS === 'Issued' &&
        invoice.DUE_DATE &&
        toISO(invoice.DUE_DATE) < today
    );

    
    const approvedSheets = allSheets.filter(
      sheet => ['Approved', 'Invoiced'].includes(sheet.STATUS)
    );


    const approvedIDs = approvedSheets.map(
      sheet => sheet.NODE_KEY
    );

    const billableEntries = approvedIDs.length
      ? await tx.run(
          SELECT.from(TimesheetEntrySrv).where({
            PARENT_NODE_KEY: { in: approvedIDs },
            IS_BILLABLE: true,
            INVOICE_NODE_KEY: null
          })
        )
      : [];

    let unbilledHours = 0;

    if (admin) {
      unbilledHours = sum(billableEntries, 'HOURS');
    } else {
      const projectMilestones = allMilestones.filter(
        milestone =>
          projectIDs.has(milestone.PROJECT_NODE_KEY)
      );

      const milestoneIDs = new Set(
        projectMilestones.map(milestone => milestone.NODE_KEY)
      );

      const taskIDs = new Set(
        allTasks
          .filter(task =>
            milestoneIDs.has(task.MILESTONE_NODE_KEY)
          )
          .map(task => task.NODE_KEY)
      );

      unbilledHours = sum(
        billableEntries.filter(
          entry => taskIDs.has(entry.TASK_NODE_KEY)
        ),
        'HOURS'
      );
    }

    Object.assign(result, {
      pendingApprovals: pending.length,
      atRiskBudgets: atRisk.length,
      activeProjects: scopedProjects.length,
      draftInvoices: drafts.length,
      unbilledHours,
      overdueInvoices: overdue.length,
      overdueAmount: sum(overdue, 'GROSS_AMOUNT'),
      clients: clients.length,
      employees: employees.length
    });

    return result;
  });


  this.on('getBudgetSummary', async req => {
    const tx = txFor(req);
    const projectID = required(req.data.projectID, 'Project ID');

    const budget = await projectBudget(tx, projectID);

    if (!budget) {
      fail('No budget exists for this project.', 404);
    }

    return JSON.stringify({
      budgetAmount: budget.BUDGET_AMOUNT,
      consumedAmount: budget.CONSUMED_AMOUNT,
      remainingAmount: budget.REMAINING_AMOUNT,
      consumedPercent: budget.CONSUMED_PERCENT,
      status: budget.BUDGET_STATUS,
      currency: budget.CURRENCY_CODE
    });
  });

  this.on('getProjectAlerts', async req => {
    const projectID = required(req.data.projectID, 'Project ID');

    return txFor(req).run(
      SELECT.from(AlertSrv)
        .where({ PROJECT_NODE_KEY: projectID })
    );
  });

  // Bulk-action helper.
  const bulk = async (req, entity, items, mapper, label) => {
    ensureAdmin(req);

    const tx = txFor(req);

    if (!Array.isArray(items) || !items.length) {
      fail(`${label} must contain at least one record.`);
    }

    const entries = items.map(mapper);

    await tx.run(INSERT.into(entity).entries(entries));

    return `${entries.length} ${label.toLowerCase()} record(s) created.`;
  };

  // Create employees.
  this.on('createEmployees', req =>
    bulk(
      req,
      EmployeeSrv,
      req.data.employees,
      x => ({
        FIRST_NAME: required(x.FIRST_NAME, 'First name'),
        LAST_NAME: required(x.LAST_NAME, 'Last name'),
        EMAIL: required(x.EMAIL, 'Email').toLowerCase(),
        PHONE_NUMBER: x.PHONE_NUMBER,
        JOB_TITLE: x.JOB_TITLE,
        CURRENCY_CODE: x.CURRENCY_CODE || 'INR',
        HOURLY_RATE: x.HOURLY_RATE || 0,
        IS_MANAGER: !!x.IS_MANAGER,
        IS_ACTIVE: x.IS_ACTIVE ?? true,
        ...(x.MANAGER_ID
          ? { MANAGER: { NODE_KEY: x.MANAGER_ID } }
          : {})
      }),
      'Employees'
    )
  );

  // Create clients.
  this.on('createClients', req =>
    bulk(
      req,
      ClientSrv,
      req.data.clients,
      x => ({
        CLIENT_NAME: required(x.CLIENT_NAME, 'Client name'),
        CLIENT_STATUS: x.CLIENT_STATUS || 'Prospect',
        CONTACT_PERSON: x.CONTACT_PERSON,
        EMAIL: x.EMAIL?.toLowerCase(),
        PHONE: x.PHONE,
        STREET: x.STREET,
        BUILDING: x.BUILDING,
        CITY: x.CITY,
        POSTAL_CODE: x.POSTAL_CODE,
        COUNTRY: x.COUNTRY
      }),
      'Clients'
    )
  );

  // Create projects.
  this.on('createProjects', async req => {
    return bulk(
      req,
      ProjectSrv,
      req.data.projects,
      x => {
        if (
          x.START_DATE &&
          x.END_DATE &&
          toISO(x.END_DATE) < toISO(x.START_DATE)
        ) {
          fail('Project end date cannot be before start date.');
        }

        if (
          x.PLANNED_HOURS !== undefined &&
          Number(x.PLANNED_HOURS) <= 0
        ) {
          fail('Planned hours must be greater than zero.');
        }

        return {
          PROJECT_CODE: required(x.PROJECT_CODE, 'Project code'),
          PROJECT_NAME: required(x.PROJECT_NAME, 'Project name'),
          PROJECT_STATUS: x.PROJECT_STATUS || 'Draft',
          BILLING_TYPE: required(x.BILLING_TYPE, 'Billing type'),
          START_DATE: x.START_DATE,
          END_DATE: x.END_DATE,
          PLANNED_HOURS: x.PLANNED_HOURS || 0,
          ...(x.CLIENT_ID
            ? { CLIENT: { NODE_KEY: x.CLIENT_ID } }
            : {}),
          ...(x.MANAGER_ID
            ? { MANAGER: { NODE_KEY: x.MANAGER_ID } }
            : {})
        };
      },
      'Projects'
    );
  });

  // Create budgets.
  this.on('createBudgets', req =>
    bulk(
      req,
      BudgetSrv,
      req.data.budgets,
      x => {
        if (Number(x.BUDGET_AMOUNT) <= 0) {
          fail('Budget amount must be greater than zero.');
        }

        return {
          BUDGET_AMOUNT: x.BUDGET_AMOUNT,
          BILLING_RATE: x.BILLING_RATE || 0,
          RETAINER_FEE: x.RETAINER_FEE || 0,
          CURRENCY_CODE: x.CURRENCY_CODE || 'INR',
          CONSUMED_AMOUNT: 0,
          REMAINING_AMOUNT: x.BUDGET_AMOUNT,
          CONSUMED_PERCENT: 0,
          BUDGET_STATUS: 'Within Budget',
          PROJECT: {
            NODE_KEY: required(x.PROJECT_ID, 'Project ID')
          }
        };
      },
      'Budgets'
    )
  );

  // Create milestones.
  this.on('createMilestones', async req =>
    bulk(
      req,
      MilestoneSrv,
      req.data.milestones,
      x => {
        if (
          x.START_DATE &&
          x.END_DATE &&
          toISO(x.END_DATE) < toISO(x.START_DATE)
        ) {
          fail('Milestone end date cannot be before start date.');
        }

        return {
          MILESTONE_NAME: required(x.MILESTONE_NAME, 'Milestone name'),
          START_DATE: x.START_DATE,
          END_DATE: x.END_DATE,
          COMPLETION_PERCENT: 0,
          PROJECT: {
            NODE_KEY: required(x.PROJECT_ID, 'Project ID')
          }
        };
      },
      'Milestones'
    )
  );

  // Create tasks.
  this.on('createTasks', req =>
    bulk(
      req,
      TaskSrv,
      req.data.tasks,
      x => {
        if (Number(x.ESTIMATED_HOURS) <= 0) {
          fail('Estimated hours must be greater than zero.');
        }

        return {
          TASK_NAME: required(x.TASK_NAME, 'Task name'),
          STATUS: x.STATUS || 'To Do',
          ESTIMATED_HOURS: x.ESTIMATED_HOURS,
          ACTUAL_HOURS: 0,
          BURN_PERCENT: 0,
          ...(x.MILESTONE_ID
            ? { MILESTONE: { NODE_KEY: x.MILESTONE_ID } }
            : {}),
          ...(x.ASSIGNEE_ID
            ? { ASSIGNEE: { NODE_KEY: x.ASSIGNEE_ID } }
            : {})
        };
      },
      'Tasks'
    )
  );

  // Create timesheets in bulk.
  this.on('createTimesheets', req =>
    bulk(
      req,
      TimesheetSrv,
      req.data.timesheets,
      x => ({
        WEEK_START: mondayOf(x.WEEK_START || todayISO()),
        WEEK_END: addDays(
          mondayOf(x.WEEK_START || todayISO()),
          6
        ),
        TOTAL_HOURS: 0,
        STATUS: 'Draft',
        EMPLOYEE: {
          NODE_KEY: required(x.EMPLOYEE_ID, 'Employee ID')
        }
      }),
      'Timesheets'
    )
  );


  // Create timesheet entries in bulk.
  this.on('createTimesheetEntries', async req => {
    ensureAdmin(req);

    const tx = txFor(req);
    const items = req.data.entries;

    if (!Array.isArray(items) || !items.length) {
      fail('Timesheet entries must contain at least one record.');
    }

    const createdEntries = [];
    const affectedSheetIDs = new Set();

    for (const x of items) {
      const workDate = toISO(required(x.WORK_DATE, 'Work date'));
      const hours = Number(x.HOURS ?? 8);
      const taskID = required(x.TASK_ID, 'Task ID');
      const sheetID = required(x.PARENT_ID, 'Timesheet ID');

      if (!Number.isFinite(hours) || hours < 0.25 || hours > 24) {
        fail('Entry hours must be between 0.25 and 24.');
      }

      const sheet = await getOne(tx, TimesheetSrv, sheetID, 'Timesheet');
      const task = await getOne(tx, TaskSrv, taskID, 'Task');

      if (!['Draft', 'Rejected'].includes(sheet.STATUS)) {
        fail('Entries can only be added to Draft or Rejected timesheets.');
      }

      if (workDate < toISO(sheet.WEEK_START) ||
          workDate > toISO(sheet.WEEK_END)) {
        fail('Entry date must be within the timesheet week.');
      }

      if (task.STATUS === 'Done') {
        fail('Time cannot be booked against a completed task.');
      }

      const entry = {
        WORK_DATE: workDate,
        HOURS: hours,
        IS_BILLABLE: x.IS_BILLABLE ?? true,
        NOTES: x.NOTES || '',
        TASK: { NODE_KEY: taskID },
        PARENT: { NODE_KEY: sheetID }
      };

      const [created] = await tx.run(
        INSERT.into(TimesheetEntrySrv).entries(entry).returning('*')
      );

      createdEntries.push(created);
      affectedSheetIDs.add(sheetID);
    }

    for (const sheetID of affectedSheetIDs) {
      const entries = await tx.run(
        SELECT.from(TimesheetEntrySrv)
          .where({ PARENT_NODE_KEY: sheetID })
      );

      const totalHours = sum(entries, 'HOURS');

      await tx.run(
        UPDATE(TimesheetSrv)
          .set({ TOTAL_HOURS: totalHours })
          .where({ NODE_KEY: sheetID })
      );
    }

    return `${createdEntries.length} timesheet entries created and totals updated.`;
  });

  // Recalculate totals for existing timesheets.
this.on('recalculateTimesheetTotals', async req => {
  ensureAdmin(req);

  const tx = txFor(req);

  const sheets = await tx.run(
    SELECT.from(TimesheetSrv).columns(
      'NODE_KEY',
      'TOTAL_HOURS'
    )
  );

  for (const sheet of sheets) {
    const entries = await tx.run(
      SELECT.from(TimesheetEntrySrv)
        .where({ PARENT_NODE_KEY: sheet.NODE_KEY })
    );

    const totalHours = sum(entries, 'HOURS');

    await tx.run(
      UPDATE(TimesheetSrv)
        .set({ TOTAL_HOURS: totalHours })
        .where({ NODE_KEY: sheet.NODE_KEY })
    );
  }

  return 'Timesheet totals recalculated successfully.';
});

  // Create invoices in bulk.
  this.on('createInvoices', async req => {
    ensureAdmin(req);

    const tx = txFor(req);
    const made = [];

    for (const x of (req.data.invoices || [])) {
      made.push(
        await createInvoice(
          req,
          x.PROJECT_ID,
          x.PERIOD_FROM,
          x.PERIOD_TO,
          tx
        )
      );
    }

    if (!made.length) {
      fail('Invoices must contain at least one record.');
    }

    return `${made.length} invoice record(s) created.`;
  });

// Create a timesheet for the selected employee.
// Non-admin users may create only their own timesheet.
this.on("createTimesheet", async req => {
    ensureSignedIn(req);

    const tx = txFor(req);
    const employeeID = required(
        req.data.employeeID,
        "Employee ID"
    );

    let employee;

    if (isAdmin(req)) {
        employee = await getOne(
            tx,
            EmployeeSrv,
            employeeID,
            "Employee"
        );
    } else {
        const signedInEmployee = await employeeRequired(req, tx);

        if (signedInEmployee.NODE_KEY !== employeeID) {
            fail(
                "You can only create a timesheet for yourself.",
                403
            );
        }

        employee = signedInEmployee;
    }

    if (employee.IS_ACTIVE === false) {
        fail("Inactive employees cannot record time.", 403);
    }

    return validateAndCreateTimesheet(
        req,
        employee,
        req.data.weekStart,
        req.data.entries,
        tx
    );
});

  // Timesheet CRUD restrictions.
  this.before(
    ['CREATE', 'UPDATE', 'DELETE'],
    TimesheetSrv,
    async req => {
      ensureSignedIn(req);

      const tx = txFor(req);
      const employee = await employeeRequired(req, tx);

      if (isAdmin(req)) return;

      if (req.event === 'CREATE') {
        req.data.EMPLOYEE = { NODE_KEY: employee.NODE_KEY };
        req.data.WEEK_START = mondayOf(
          req.data.WEEK_START || todayISO()
        );
        req.data.WEEK_END = addDays(req.data.WEEK_START, 6);
        req.data.STATUS = 'Draft';
        return;
      }

      const sheet = await getOne(
        tx,
        TimesheetSrv,
        req.data.NODE_KEY || req.params?.[0]?.NODE_KEY,
        'Timesheet'
      );

      if (sheet.EMPLOYEE_NODE_KEY !== employee.NODE_KEY) {
        fail('You can only manage your own timesheets.', 403);
      }

      if (!['Draft', 'Rejected'].includes(sheet.STATUS)) {
        fail('Only Draft or Rejected timesheets can be edited or deleted.');
      }

      if (
        req.event === 'UPDATE' &&
        req.data.STATUS &&
        req.data.STATUS !== sheet.STATUS
      ) {
        fail('Use Submit Timesheet to change the status.');
      }
    }
  );

  // Timesheet-entry CRUD restrictions.
  this.before(
    ['CREATE', 'UPDATE', 'DELETE'],
    TimesheetEntrySrv,
    async req => {
      ensureSignedIn(req);

      const tx = txFor(req);
      const parentID =
        req.data.PARENT_NODE_KEY || req.data.PARENT?.NODE_KEY;

      if (req.event === 'CREATE' && !parentID) {
        fail('Timesheet parent is required.');
      }

      const sheet = parentID
        ? await getOne(tx, TimesheetSrv, parentID, 'Timesheet')
        : await getOne(
            tx,
            TimesheetSrv,
            req.data.PARENT_NODE_KEY,
            'Timesheet'
          );

      if (!isAdmin(req)) {
        const employee = await employeeRequired(req, tx);

        if (sheet.EMPLOYEE_NODE_KEY !== employee.NODE_KEY) {
          fail('You can only manage entries in your own timesheets.', 403);
        }
      }

      if (!['Draft', 'Rejected'].includes(sheet.STATUS)) {
        fail('Entries are locked after a timesheet is submitted.');
      }

      if (req.event !== 'DELETE') {
        const hours = Number(req.data.HOURS ?? 8);

        if (hours < 0.25 || hours > 24) {
          fail('Entry hours must be between 0.25 and 24.');
        }

        if (
          req.data.WORK_DATE &&
          (
            toISO(req.data.WORK_DATE) < toISO(sheet.WEEK_START) ||
            toISO(req.data.WORK_DATE) > toISO(sheet.WEEK_END)
          )
        ) {
          fail('Entry date must be within the timesheet week.');
        }
      }
    }
  );

  // Submit a timesheet.
  this.on('submitTimesheet', TimesheetSrv, async req => {
    ensureSignedIn(req);

    const tx = txFor(req);
    const employee = await employeeRequired(req, tx);
    const id = req.params?.[0]?.NODE_KEY || req.data.NODE_KEY;

    const sheet = await getOne(
      tx, TimesheetSrv, id, 'Timesheet'
    );

    if (
      !isAdmin(req) &&
      sheet.EMPLOYEE_NODE_KEY !== employee.NODE_KEY
    ) {
      fail('You can only submit your own timesheets.', 403);
    }

    if (!['Draft', 'Rejected'].includes(sheet.STATUS)) {
      fail('Only Draft or Rejected timesheets can be submitted.');
    }

    await validateTimesheetEntries(req, sheet, tx);

    await tx.run(
      UPDATE(TimesheetSrv)
        .set({
          STATUS: 'Submitted',
          REJECTION_REASON: null
        })
        .where({ NODE_KEY: id })
    );

    return 'Timesheet submitted for approval.';
  });

  // // Approve a submitted timesheet.
  // this.on('approveTimesheet', ApprovalSrv, async req => {
  //   ensureAdmin(req);

  //   const tx = txFor(req);
  //   const id = req.params?.[0]?.NODE_KEY || req.data.NODE_KEY;

  //   const sheet = await getOne(
  //     tx, TimesheetSrv, id, 'Timesheet'
  //   );

  //   if (sheet.STATUS !== 'Submitted') {
  //     fail('Only submitted timesheets can be approved.');
  //   }

  //   const approver = await getEmployeeForUser(req, tx);

  //   if (
  //     approver &&
  //     approver.NODE_KEY === sheet.EMPLOYEE_NODE_KEY
  //   ) {
  //     fail('You cannot approve your own timesheet.');
  //   }

  //   await tx.run(
  //     UPDATE(TimesheetSrv)
  //       .set({
  //         STATUS: 'Approved',
  //         APPROVED_BY: approver
  //           ? { NODE_KEY: approver.NODE_KEY }
  //           : null,
  //         REJECTION_REASON: null
  //       })
  //       .where({ NODE_KEY: id })
  //   );

  //   const entries = await tx.run(
  //     SELECT.from(TimesheetEntrySrv)
  //       .where({ PARENT_NODE_KEY: id })
  //   );

  //   const taskIDs = [
  //     ...new Set(
  //       entries.map(entry => entry.TASK_NODE_KEY).filter(Boolean)
  //     )
  //   ];

  //   for (const taskID of taskIDs) {
  //     const task = await getOne(
  //       tx, TaskSrv, taskID, 'Task'
  //     );

  //     const milestone = task.MILESTONE_NODE_KEY
  //       ? await tx.run(
  //           SELECT.one.from(MilestoneSrv)
  //             .where({ NODE_KEY: task.MILESTONE_NODE_KEY })
  //         )
  //       : null;

  //     if (milestone?.PROJECT_NODE_KEY) {
  //       await refreshProjectRollups(
  //         tx,
  //         milestone.PROJECT_NODE_KEY
  //       );
  //     }
  //   }

  //   return 'Timesheet approved and project rollups updated.';
  // });

  // // Reject a submitted timesheet.
  // this.on('rejectTimesheet', ApprovalSrv, async req => {
  //   ensureAdmin(req);

  //   const tx = txFor(req);
  //   const id = req.params?.[0]?.NODE_KEY || req.data.NODE_KEY;
  //   const reason = String(req.data.reason || '').trim();

  //   if (!reason) {
  //     fail('A rejection reason is required.');
  //   }

  //   const sheet = await getOne(
  //     tx, TimesheetSrv, id, 'Timesheet'
  //   );

  //   if (sheet.STATUS !== 'Submitted') {
  //     fail('Only submitted timesheets can be rejected.');
  //   }

  //   await tx.run(
  //     UPDATE(TimesheetSrv)
  //       .set({
  //         STATUS: 'Rejected',
  //         REJECTION_REASON: reason
  //       })
  //       .where({ NODE_KEY: id })
  //   );

  //   return 'Timesheet rejected. The employee can edit and resubmit it.';
  // });

  
  // Check whether the user is authorized to approve a timesheet.
  async function ensureTimesheetApprover(req, sheet, tx) {
    ensureSignedIn(req);

    if (isAdmin(req)) {
      return getEmployeeForUser(req, tx);
    }

    const approver = await employeeRequired(req, tx);

    if (approver.NODE_KEY === sheet.EMPLOYEE_NODE_KEY) {
      fail('You cannot approve your own timesheet.', 403);
    }

    
    if (
      !hasRole(req, 'PSA_Manager') &&
      approver.IS_MANAGER !== true
    ) {

      fail('Only managers or admins can approve timesheets.', 403);
    }

    // A manager may approve a direct report's timesheet.
    const employee = await getOne(
      tx, EmployeeSrv, sheet.EMPLOYEE_NODE_KEY, 'Employee'
    );

    if (employee.MANAGER_NODE_KEY === approver.NODE_KEY) {
      return approver;
    }

    // A manager may also approve work performed on a project
    // that they manage.
    const entries = await tx.run(
      SELECT.from(TimesheetEntrySrv)
        .where({ PARENT_NODE_KEY: sheet.NODE_KEY })
    );

    for (const entry of entries) {
      if (!entry.TASK_NODE_KEY) continue;

      const task = await getOne(
        tx, TaskSrv, entry.TASK_NODE_KEY, 'Task'
      );

      if (!task.MILESTONE_NODE_KEY) continue;

      const milestone = await getOne(
        tx, MilestoneSrv, task.MILESTONE_NODE_KEY, 'Milestone'
      );

      if (!milestone.PROJECT_NODE_KEY) continue;

      const project = await getOne(
        tx, ProjectSrv, milestone.PROJECT_NODE_KEY, 'Project'
      );

      if (project.MANAGER_NODE_KEY === approver.NODE_KEY) {
        return approver;
      }
    }

    fail('You are not authorized to approve this timesheet.', 403);
  }

  // Approve a submitted timesheet.
  this.on('approveTimesheet', ApprovalSrv, async req => {
    const tx = txFor(req);
    const id = req.params?.[0]?.NODE_KEY || req.data.NODE_KEY;

    const sheet = await getOne(
      tx, TimesheetSrv, id, 'Timesheet'
    );

    if (sheet.STATUS !== 'Submitted') {
      fail('Only submitted timesheets can be approved.');
    }

    const approver = await ensureTimesheetApprover(req, sheet, tx);

    await tx.run(
      UPDATE(TimesheetSrv)
        .set({
          STATUS: 'Approved',
          APPROVED_BY: approver
            ? { NODE_KEY: approver.NODE_KEY }
            : null,
          REJECTION_REASON: null
        })
        .where({ NODE_KEY: id })
    );

    const entries = await tx.run(
      SELECT.from(TimesheetEntrySrv)
        .where({ PARENT_NODE_KEY: id })
    );

    const taskIDs = [
      ...new Set(
        entries.map(entry => entry.TASK_NODE_KEY).filter(Boolean)
      )
    ];

    for (const taskID of taskIDs) {
      const task = await getOne(
        tx, TaskSrv, taskID, 'Task'
      );

      const milestone = task.MILESTONE_NODE_KEY
        ? await tx.run(
            SELECT.one.from(MilestoneSrv)
              .where({ NODE_KEY: task.MILESTONE_NODE_KEY })
          )
        : null;

      if (milestone?.PROJECT_NODE_KEY) {
        await refreshProjectRollups(
          tx,
          milestone.PROJECT_NODE_KEY
        );
      }
    }

    return 'Timesheet approved and project rollups updated.';
  });

  // Reject a submitted timesheet.
  this.on('rejectTimesheet', ApprovalSrv, async req => {
    const tx = txFor(req);
    const id = req.params?.[0]?.NODE_KEY || req.data.NODE_KEY;
    const reason = String(req.data.reason || '').trim();

    if (!reason) {
      fail('A rejection reason is required.');
    }

    const sheet = await getOne(
      tx, TimesheetSrv, id, 'Timesheet'
    );

    if (sheet.STATUS !== 'Submitted') {
      fail('Only submitted timesheets can be rejected.');
    }

    await ensureTimesheetApprover(req, sheet, tx);

    await tx.run(
      UPDATE(TimesheetSrv)
        .set({
          STATUS: 'Rejected',
          REJECTION_REASON: reason
        })
        .where({ NODE_KEY: id })
    );

    return 'Timesheet rejected. The employee can edit and resubmit it.';
  });


  // Budget recalculation actions.
  this.on('recalculateBudget', ProjectSrv, async req => {
    ensureAdmin(req);

    const id = req.params?.[0]?.NODE_KEY || req.data.NODE_KEY;

    return refreshProjectRollups(
      txFor(req),
      required(id, 'Project ID')
    );
  });

  this.on('recalculateBudget', async req => {
    ensureAdmin(req);

    return refreshProjectRollups(
      txFor(req),
      required(req.data.projectID, 'Project ID')
    );
  });

  this.on('checkBudgetAlerts', async req => {
    ensureAdmin(req);

    const tx = txFor(req);
    const id = required(req.data.projectID, 'Project ID');
    const budget = await projectBudget(tx, id);

    if (!budget) {
      fail('No budget exists for this project.', 404);
    }

    await maintainAlerts(
      tx,
      id,
      Number(budget.CONSUMED_PERCENT || 0),
      null
    );

    return 'Budget alerts checked.';
  });

  // Invoice lifecycle.
  this.on('generateInvoice', async req =>
    createInvoice(
      req,
      req.data.projectID,
      req.data.periodFrom,
      req.data.periodTo,
      txFor(req)
    )
  );

  this.on('issueInvoice', InvoiceSrv, async req => {
    ensureAdmin(req);

    const tx = txFor(req);
    const id = req.params?.[0]?.NODE_KEY || req.data.NODE_KEY;

    const invoice = await getOne(
      tx, InvoiceSrv, id, 'Invoice'
    );

    if (invoice.STATUS !== 'Draft') {
      fail('Only draft invoices can be issued.');
    }

    await tx.run(
      UPDATE(InvoiceSrv)
        .set({ STATUS: 'Issued' })
        .where({ NODE_KEY: id })
    );

    return 'Invoice issued.';
  });

  this.on('markInvoicePaid', InvoiceSrv, async req => {
    ensureAdmin(req);

    const tx = txFor(req);
    const id = req.params?.[0]?.NODE_KEY || req.data.NODE_KEY;

    const invoice = await getOne(
      tx, InvoiceSrv, id, 'Invoice'
    );

    if (invoice.STATUS !== 'Issued') {
      fail('Only issued invoices can be marked as paid.');
    }

    await tx.run(
      UPDATE(InvoiceSrv)
        .set({ STATUS: 'Paid' })
        .where({ NODE_KEY: id })
    );

    const projectID = invoice.PROJECT_NODE_KEY;

    if (projectID) {
      await refreshProjectRollups(tx, projectID);
    }

    return 'Invoice marked as paid.';
  });

  // Core validations for direct Fiori CRUD.
  this.before('CREATE', ClientSrv, async req => {
    ensureAdmin(req);

    if (req.data.EMAIL) {
      const duplicate = await txFor(req).run(
        SELECT.one.from(ClientSrv)
          .where`lower(EMAIL) = ${String(req.data.EMAIL).toLowerCase()}`
      );

      if (duplicate) {
        fail('A client with this email already exists.');
      }
    }
  });

  this.before(['CREATE', 'UPDATE'], EmployeeSrv, async req => {
    ensureAdmin(req);

    if (req.data.EMAIL) {
      const email = String(req.data.EMAIL).trim().toLowerCase();

      const query = SELECT.one.from(EmployeeSrv)
        .where`lower(EMAIL) = ${email}`;

      if (req.event === 'UPDATE' && req.data.NODE_KEY) {
        query.where({
          NODE_KEY: { '!=': req.data.NODE_KEY }
        });
      }

      if (await txFor(req).run(query)) {
        fail('An employee with this email already exists.');
      }

      req.data.EMAIL = email;
    }
  });

  this.before(['CREATE', 'UPDATE'], ProjectSrv, async req => {
    ensureAdmin(req);

    if (
      req.data.START_DATE &&
      req.data.END_DATE &&
      toISO(req.data.END_DATE) < toISO(req.data.START_DATE)
    ) {
      fail('Project end date cannot be before start date.');
    }

    if (
      req.data.PLANNED_HOURS !== undefined &&
      Number(req.data.PLANNED_HOURS) <= 0
    ) {
      fail('Planned hours must be greater than zero.');
    }

    if (req.data.PROJECT_CODE) {
      const query = SELECT.one.from(ProjectSrv)
        .where({ PROJECT_CODE: req.data.PROJECT_CODE });

      if (req.event === 'UPDATE' && req.data.NODE_KEY) {
        query.where({
          NODE_KEY: { '!=': req.data.NODE_KEY }
        });
      }

      if (await txFor(req).run(query)) {
        fail('Project code must be unique.');
      }
    }
  });

  this.before(['CREATE', 'UPDATE'], BudgetSrv, async req => {
    ensureAdmin(req);

    if (
      req.data.BUDGET_AMOUNT !== undefined &&
      Number(req.data.BUDGET_AMOUNT) <= 0
    ) {
      fail('Budget amount must be greater than zero.');
    }
  });

  this.before(['CREATE', 'UPDATE'], MilestoneSrv, async req => {
    ensureAdmin(req);

    if (
      req.data.START_DATE &&
      req.data.END_DATE &&
      toISO(req.data.END_DATE) < toISO(req.data.START_DATE)
    ) {
      fail('Milestone end date cannot be before start date.');
    }

    const projectID =
      req.data.PROJECT_NODE_KEY || req.data.PROJECT?.NODE_KEY;

    if (projectID) {
      await validateProjectDates(
        txFor(req),
        projectID,
        req.data.START_DATE,
        req.data.END_DATE
      );
    }
  });

  this.before(['CREATE', 'UPDATE'], TaskSrv, async req => {
    if (!isAdmin(req)) {
      fail('Only PSA administrators can modify tasks.', 403);
    }

    if (
      req.data.ESTIMATED_HOURS !== undefined &&
      Number(req.data.ESTIMATED_HOURS) <= 0
    ) {
      fail('Estimated hours must be greater than zero.');
    }
  });

  // Recompute the parent total after entry changes.
  this.after(
    ['CREATE', 'UPDATE', 'DELETE'],
    TimesheetEntrySrv,
    async (_, req) => {
      const tx = txFor(req);
      const id =
        req.data.PARENT_NODE_KEY || req.data.PARENT?.NODE_KEY;

      if (!id) return;

      const entries = await tx.run(
        SELECT.from(TimesheetEntrySrv)
          .where({ PARENT_NODE_KEY: id })
      );

      const daily = {};

      for (const entry of entries) {
        const day = toISO(entry.WORK_DATE);

        daily[day] =
          (daily[day] || 0) + Number(entry.HOURS || 0);

        if (daily[day] > 24) {
          fail('Total hours for a day cannot exceed 24.');
        }
      }

      await tx.run(
        UPDATE(TimesheetSrv)
          .set({ TOTAL_HOURS: sum(entries, 'HOURS') })
          .where({ NODE_KEY: id })
      );
    }
  );

  // Refresh project figures when project data is saved.
  this.after(['CREATE', 'UPDATE'], ProjectSrv, async (row, req) => {
    if (row?.NODE_KEY && isAdmin(req)) {
      await refreshProjectRollups(
        txFor(req),
        row.NODE_KEY
      );
    }
  });
});