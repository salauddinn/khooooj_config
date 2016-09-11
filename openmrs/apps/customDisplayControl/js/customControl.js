'use strict';

angular.module('bahmni.common.displaycontrol.custom')
    .directive('birthCertificate', ['observationsService', 'appService', 'spinner', function (observationsService, appService, spinner) {
            var link = function ($scope) {
                console.log("inside birth certificate");
                var conceptNames = ["HEIGHT"];
                $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/birthCertificate.html";
                spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                    $scope.observations = response.data;
                }));
            };

            return {
                restrict: 'E',
                template: '<ng-include src="contentUrl"/>',
                link: link
            }
    }]).directive('deathCertificate', ['observationsService', 'appService', 'spinner', function (observationsService, appService, spinner) {
        var link = function ($scope) {
            var conceptNames = ["WEIGHT"];
            $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/deathCertificate.html";
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                $scope.observations = response.data;
            }));
        };

        return {
            restrict: 'E',
            link: link,
            template: '<ng-include src="contentUrl"/>'
        }
    }]).directive('customTreatmentChart', ['appService', 'treatmentConfig', 'TreatmentService', 'spinner', '$q', function (appService, treatmentConfig, treatmentService, spinner, $q) {
    var link = function ($scope) {
        var Constants = Bahmni.Clinical.Constants;
        var days = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/customTreatmentChart.html";

        $scope.atLeastOneDrugForDay = function (day) {
            var atLeastOneDrugForDay = false;
            $scope.ipdDrugOrders.getIPDDrugs().forEach(function (drug) {
                if (drug.isActiveOnDate(day.date)) {
                    atLeastOneDrugForDay = true;
                }
            });
            return atLeastOneDrugForDay;
        };

        $scope.getVisitStopDateTime = function () {
            return $scope.visitSummary.stopDateTime || Bahmni.Common.Util.DateUtil.now();
        };

        $scope.getStatusOnDate = function (drug, date) {
            var activeDrugOrders = _.filter(drug.orders, function (order) {
                if ($scope.config.frequenciesToBeHandled.indexOf(order.getFrequency()) !== -1) {
                    return getStatusBasedOnFrequency(order, date);
                } else {
                    return drug.getStatusOnDate(date) === 'active';
                }
            });
            if (activeDrugOrders.length === 0) {
                return 'inactive';
            }
            if (_.every(activeDrugOrders, function (order) {
                    return order.getStatusOnDate(date) === 'stopped';
                })) {
                return 'stopped';
            }
            return 'active';
        };

        var getStatusBasedOnFrequency = function (order, date) {
            var activeBetweenDate = order.isActiveOnDate(date);
            var frequencies = order.getFrequency().split(",").map(function (day) {
                return day.trim();
            });
            var dayNumber = moment(date).day();
            return activeBetweenDate && frequencies.indexOf(days[dayNumber]) !== -1;
        };

        var init = function () {
            var getToDate = function () {
                return $scope.visitSummary.stopDateTime || Bahmni.Common.Util.DateUtil.now();
            };

            var programConfig = appService.getAppDescriptor().getConfigValue("program") || {};

            var startDate = null, endDate = null, getEffectiveOrdersOnly = false;
            if (programConfig.showDetailsWithinDateRange) {
                startDate = $stateParams.dateEnrolled;
                endDate = $stateParams.dateCompleted;
                if (startDate || endDate) {
                    $scope.config.showOtherActive = false;
                }
                getEffectiveOrdersOnly = true;
            }

            return $q.all([treatmentConfig(), treatmentService.getPrescribedAndActiveDrugOrders($scope.config.patientUuid, $scope.config.numberOfVisits,
                $scope.config.showOtherActive, $scope.config.visitUuids || [], startDate, endDate, getEffectiveOrdersOnly)])
                .then(function (results) {
                    var config = results[0];
                    var drugOrderResponse = results[1].data;
                    var createDrugOrderViewModel = function (drugOrder) {
                        return Bahmni.Clinical.DrugOrderViewModel.createFromContract(drugOrder, config);
                    };
                    for (var key in drugOrderResponse) {
                        drugOrderResponse[key] = drugOrderResponse[key].map(createDrugOrderViewModel);
                    }

                    var groupedByVisit = _.groupBy(drugOrderResponse.visitDrugOrders, function (drugOrder) {
                        return drugOrder.visit.startDateTime;
                    });
                    var treatmentSections = [];

                    for (var key in groupedByVisit) {
                        var values = Bahmni.Clinical.DrugOrder.Util.mergeContinuousTreatments(groupedByVisit[key]);
                        treatmentSections.push({visitDate: key, drugOrders: values});
                    }
                    if (!_.isEmpty(drugOrderResponse[Constants.otherActiveDrugOrders])) {
                        var mergedOtherActiveDrugOrders = Bahmni.Clinical.DrugOrder.Util.mergeContinuousTreatments(drugOrderResponse[Constants.otherActiveDrugOrders]);
                        treatmentSections.push({
                            visitDate: Constants.otherActiveDrugOrders,
                            drugOrders: mergedOtherActiveDrugOrders
                        });
                    }
                    $scope.treatmentSections = treatmentSections;
                    if ($scope.visitSummary) {
                        $scope.ipdDrugOrders = Bahmni.Clinical.VisitDrugOrder.createFromDrugOrders(drugOrderResponse.visitDrugOrders, $scope.visitSummary.startDateTime, getToDate());
                    }
                });
        };
        spinner.forPromise(init());
    };

    return {
        restrict: 'E',
        link: link,
        scope: {
            config: "=",
            visitSummary: '='
        },
        template: '<ng-include src="contentUrl"/>'
    }
}]).directive('referralForm', ['$q','observationsService','visitService', 'bedService','appService', 'spinner','$sce', function ($q,observationsService, visitService, bedService,appService, spinner, $sce) 
    {
        var link = function ($scope) 
        {
            
            var conceptNames = ["Referral Form"];
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                    $scope.observations = response.data[0];
                    $scope.referralForm = [];
                    function createForm(obs) {
                           if (obs.groupMembers.length == 0){
                              if ($scope.referralForm[obs.conceptNameToDisplay] == undefined){
                                 $scope.referralForm[obs.conceptNameToDisplay] = obs.valueAsString;
                              }
                              else{
                                 $scope.referralForm[obs.conceptNameToDisplay] = $scope.referralForm[obs.conceptNameToDisplay] + ' ' + obs.valueAsString;                                
                              }

                              if(obs.comment != null){
                                $scope.referralForm[obs.conceptNameToDisplay] = $scope.referralForm[obs.conceptNameToDisplay] + ' ' + obs.comment;
                              }   
                           }
                           else{
                              for(var i = 0; i < obs.groupMembers.length; i++) { 
                                   createForm(obs.groupMembers[i]);
                              }
                              
                           }

                    }
                    createForm(response.data[0]);

                }));
            $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/referralform.html";
            
                            
        };
        var controller = function($scope){
            $scope.htmlLabel = function(label){
                return $sce.trustAsHtml(label)
            }
            $scope.date = new Date();
        }
        return {
            restrict: 'E',
            link: link,
            controller : controller,
            template: '<ng-include src="contentUrl"/>'
        }
    }]).directive('referraltrForm', ['$q','observationsService','visitService','appService', 'spinner','$sce', function ($q,observationsService, visitService,appService, spinner, $sce)
    {
        var link = function ($scope)
        {

            var conceptNames = ["Referral Form"];
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                $scope.observations = response.data[0];
                $scope.referralForm = [];

            }));
            $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/referraltrform.html";


        };
        var controller = function($scope){
            $scope.htmlLabel = function(label){
                return $sce.trustAsHtml(label)
            }
            $scope.date = new Date();
        }
        return {
            restrict: 'E',
            link: link,
            controller : controller,
            template: '<ng-include src="contentUrl"/>'
        }
    }]).directive('referralprForm', ['$q','observationsService','visitService','appService', 'spinner','$sce', function ($q,observationsService, visitService,appService, spinner, $sce)
    {
        var link = function ($scope)
        {

            var conceptNames = ["Referral Form"];
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                $scope.observations = response.data[0];
                $scope.referralForm = [];

            }));
            $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/referralprform.html";


        };
        var controller = function($scope){
            $scope.htmlLabel = function(label){
                return $sce.trustAsHtml(label)
            }
            $scope.date = new Date();
        }
        return {
            restrict: 'E',
            link: link,
            controller : controller,
            template: '<ng-include src="contentUrl"/>'
        }
    }]).directive('referralflForm', ['$q','observationsService','visitService','appService', 'spinner','$sce', function ($q,observationsService, visitService,appService, spinner, $sce)
    {
        var link = function ($scope)
        {

            var conceptNames = ["Referral Form"];
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                $scope.observations = response.data[0];
                $scope.referralForm = [];

            }));
            $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/referralflform.html";


        };
        var controller = function($scope){
            $scope.htmlLabel = function(label){
                return $sce.trustAsHtml(label)
            }
            $scope.date = new Date();
        }
        return {
            restrict: 'E',
            link: link,
            controller : controller,
            template: '<ng-include src="contentUrl"/>'
        }
    }]).directive('referralfmDoctor', ['observationsService', 'appService', 'spinner', function (observationsService, appService, spinner) {
        var link = function ($scope) {
            var conceptNames = ["Referral Form, Doctors Name"];
            var conceptName=["Referral Form, Health Center"];
            $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/referraldocname.html";
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                $scope.observations = response.data[0];
            }));
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptName, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                $scope.observation = response.data[0];
            }));

        };

        return {
            restrict: 'E',
            link: link,
            template: '<ng-include src="contentUrl"/>'
        }
    }]).directive('referralSummary', ['$q','observationsService','appService', 'spinner','$sce', function ($q,observationsService,appService, spinner, $sce)
           {
               var link = function ($scope)
               {

                   var conceptNames = ["Referral form, Summary"];
                    var conceptName=["Referral Form, Referral Follow up"];
                   spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                           $scope.observations = response.data[0];
                           $scope.refsummryForm = []
                           function createForm(obs) {
                           if ($scope.observations==undefined)
                              { 
                                   console.log("template not filled");
                               }
                            else
                               {
                                  if (obs.groupMembers.length == 0){
                                     if ($scope.refsummryForm[obs.conceptNameToDisplay] == undefined){
                                        $scope.refsummryForm[obs.conceptNameToDisplay] = obs.valueAsString;
                                     }
                                     else{
                                        $scope.refsummryForm[obs.conceptNameToDisplay] = $scope.refsummryForm[obs.conceptNameToDisplay] + ' ' + obs.valueAsString;
                                     }

                                     if(obs.comment != null){
                                       $scope.refsummryForm[obs.conceptNameToDisplay] = $scope.refsummryForm[obs.conceptNameToDisplay] + ' ' + obs.comment;
                                     }
                                  }
                                  else{
                                     for(var i = 0; i < obs.groupMembers.length; i++) {
                                          createForm(obs.groupMembers[i]);
                                     }

                                  }
                                }
                           }
                           createForm(response.data[0]);



                       }));
                     spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptName, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                                   $scope.observation = response.data[0];
                               }));

                   $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/referralSummary.html";
                   $scope.curDate=new Date();

               };
               var controller = function($scope){
                $scope.htmlLabel = function(label){
                    return $sce.trustAsHtml(label)
                }
               }
               return {
                   restrict: 'E',
                   link: link,
                   controller : controller,
                   template: '<ng-include src="contentUrl"/>'
               }
}]);
