Bahmni.ConceptSet.FormConditions.rules = {
    'Diastolic BP (mm Hg)' : function (formName, formFieldValues) {
        var systolic = formFieldValues['Systolic BP (mm Hg)'];
        var diastolic = formFieldValues['Diastolic BP (mm Hg)'];
        if (systolic || diastolic) {
            return {
                enable: ["Posture"]
            }
        } else {
            return {
                disable: ["Posture"]
            }
        }
    },
    'Systolic BP (mm Hg)' : function (formName, formFieldValues) {
        var systolic = formFieldValues['Systolic BP (mm Hg)'];
        var diastolic = formFieldValues['Diastolic BP (mm Hg)'];
        if (systolic || diastolic) {
            return {
                enable: ["Posture"]
            }
        } else {
            return {
                disable: ["Posture"]
            }
        }
    }
};