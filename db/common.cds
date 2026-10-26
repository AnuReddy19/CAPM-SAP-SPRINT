namespace psaa.common;

using { managed } from '@sap/cds/common';

// =====================================================
// 1. REUSABLE DATA TYPES
// =====================================================

type Guid         : UUID;

type String20     : String(20);
type String32     : String(32);
type String60     : String(60);
type String100    : String(100);
type String255    : String(255);
type String500    : String(500);

type Email        : String(100);
type PhoneNo      : String(20);
type CurrencyCode : String(3);

type Amount       : Decimal(15,2);
type Hours        : Decimal(10,2);
type Percentage   : Decimal(7,2);

// =====================================================
// 2. CLIENT STATUS
// =====================================================

type ClientStatus : String enum {
    ACTIVE   = 'Active';
    INACTIVE = 'Inactive';
    PROSPECT = 'Prospect';
}

// =====================================================
// 3. PROJECT STATUS
// =====================================================

type ProjectStatus : String enum {
    DRAFT     = 'Draft';
    ACTIVE    = 'Active';
    ON_HOLD   = 'On Hold';
    COMPLETED = 'Completed';
    CANCELLED = 'Cancelled';
}

// =====================================================
// 4. BILLING TYPE
// =====================================================

type BillingType : String enum {
    FIXED    = 'Fixed';
    TM       = 'T&M';
    RETAINER = 'Retainer';
}

// =====================================================
// 5. BUDGET STATUS
// =====================================================

type BudgetStatus : String enum {
    WITHIN_BUDGET = 'Within Budget';
    AT_RISK        = 'At Risk';
    BREACHED       = 'Breached';
}

// =====================================================
// 6. TASK STATUS
// =====================================================

type TaskStatus : String enum {
    TODO        = 'To Do';
    IN_PROGRESS = 'In Progress';
    DONE        = 'Done';
}

// =====================================================
// 7. TIMESHEET STATUS
// =====================================================

type TimesheetStatus : String enum {
    DRAFT     = 'Draft';
    SUBMITTED = 'Submitted';
    APPROVED  = 'Approved';
    REJECTED  = 'Rejected';
    INVOICED  = 'Invoiced';
}

// =====================================================
// 8. INVOICE STATUS
// =====================================================

type InvoiceStatus : String enum {
    DRAFT  = 'Draft';
    ISSUED = 'Issued';
    PAID   = 'Paid';
}

// =====================================================
// 9. REUSABLE ASPECTS
// =====================================================

// Common creation and modification metadata
aspect AuditInfo : managed {}

// Common address fields
aspect Address {
    STREET      : String255;
    BUILDING    : String60;
    CITY        : String100;
    POSTAL_CODE : String20;
    COUNTRY     : String60;
}

// Reusable monetary fields for invoices
aspect AmountFields {
    NET_AMOUNT   : Amount;
    TAX_AMOUNT   : Amount;
    GROSS_AMOUNT : Amount;
    CURRENCY     : CurrencyCode default 'INR';
}

// Reusable date range
aspect DateRange {
    START_DATE : Date;
    END_DATE   : Date;
}
