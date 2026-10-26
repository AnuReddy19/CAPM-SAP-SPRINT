
using PSAService as service from '../../srv/psa-service';

annotate service.TaskSrv with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Task Name',
                Value : TASK_NAME,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Status',
                Value : STATUS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Project Code',
                Value : PROJECT_CODE,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Estimated Hours',
                Value : ESTIMATED_HOURS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Actual Hours',
                Value : ACTUAL_HOURS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Burn Percent',
                Value : BURN_PERCENT,
            },
            {
                $Type : 'UI.DataFieldForAnnotation',
                Label : 'Task Criticality',
                Target : '@UI.DataPoint#TaskCriticality'
            },
        ],
    },

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Task Name',
            Value : TASK_NAME,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Status',
            Value : STATUS,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Project Code',
            Value : PROJECT_CODE,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Estimated Hours',
            Value : ESTIMATED_HOURS,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Actual Hours',
            Value : ACTUAL_HOURS,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Burn Percent',
            Value : BURN_PERCENT,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Criticality',
            Value : CRITICALITY,
        },
    ],

    UI.SelectionFields : [
        TASK_NAME,
        STATUS,
        PROJECT_CODE,
    ],

    UI.HeaderInfo : {
    TypeName : 'Task',
    TypeNamePlural : 'Tasks',
    Title : {
        $Type : 'UI.DataField',
        Value : TASK_NAME
    },
    Description : {
        $Type : 'UI.DataField',
        Value : STATUS
    }
},

UI.DataPoint #TaskCriticality : {
    Value : CRITICALITY,
    Title : 'Task Criticality',
    Criticality : CRITICALITY
},

);
