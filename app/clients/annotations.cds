
using PSAService as service from '../../srv/psa-service';

// -------------------------------------------------
// CLIENT LIST REPORT AND OBJECT PAGE
// -------------------------------------------------

annotate service.ClientSrv with @(
    // Fields available for filtering in the List Report
    UI.SelectionFields : [
        CLIENT_NAME,
        CLIENT_STATUS,
        CITY,
        COUNTRY
    ],

    // Object Page: Client details
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Client Name',
                Value : CLIENT_NAME
            },
            {
                $Type : 'UI.DataField',
                Label : 'Client Status',
                Value : CLIENT_STATUS
            },
            {
                $Type : 'UI.DataField',
                Label : 'Contact Person',
                Value : CONTACT_PERSON
            },
            {
                $Type : 'UI.DataField',
                Label : 'Email',
                Value : EMAIL
            },
            {
                $Type : 'UI.DataField',
                Label : 'Phone',
                Value : PHONE
            },
            {
                $Type : 'UI.DataField',
                Label : 'Street',
                Value : STREET
            },
            {
                $Type : 'UI.DataField',
                Label : 'Building',
                Value : BUILDING
            },
            {
                $Type : 'UI.DataField',
                Label : 'City',
                Value : CITY
            },
            {
                $Type : 'UI.DataField',
                Label : 'Postal Code',
                Value : POSTAL_CODE
            },
            {
                $Type : 'UI.DataField',
                Label : 'Country',
                Value : COUNTRY
            }
        ]
    },

    // List Report: Main client columns
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Client Name',
            Value : CLIENT_NAME
        },
        {
            $Type : 'UI.DataField',
            Label : 'Client Status',
            Value : CLIENT_STATUS
        },
        {
            $Type : 'UI.DataField',
            Label : 'Contact Person',
            Value : CONTACT_PERSON
        },
        {
            $Type : 'UI.DataField',
            Label : 'Email',
            Value : EMAIL
        },
        {
            $Type : 'UI.DataField',
            Label : 'Phone',
            Value : PHONE
        },
        {
            $Type : 'UI.DataField',
            Label : 'City',
            Value : CITY
        },
        {
            $Type : 'UI.DataField',
            Label : 'Country',
            Value : COUNTRY
        }
    ],

    // Object Page sections
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'Client Information',
            Target : '@UI.FieldGroup#GeneratedGroup'
        }
    ]
);
