﻿
(function () {

    var mod = angular.module('Page', []);
    mod.controller('PageController', function ($scope, $http, $sce) {

        var me = this;

        $scope.object = window.allData.RMA;
        $scope.branding = window.branding;
        $scope.isAdmin = window.isAdmin == "True" ? true : false;
        $scope.allStatus = ["InQueue", "CheckingIssues", "ResearchOnSolution", "WaitingForParts", "ReassembleAndTesting", "ReadyToShip", "Shipped", "Delivered"];
        $scope.methods = ["DHL", "Kerry", "Carrying"];

        for (var i = 0; i < $scope.allStatus.length; i++) {
            if ($scope.object.Status == $scope.allStatus[i]) {
                $scope.StatusState = i;
            }
        }


        console.log("WARNING: Using Status list from client side");

        me.getTrackUrl = function (dhlTrackingNumber) {
            if ($scope.object.DHLTrackingNumber != null) {
                $scope.trackingUrl = $sce.trustAsResourceUrl('http://www.dhl.com/cgi-bin/tracking.pl?AWB=' + dhlTrackingNumber);
            }
        }

        //if ($scope.object.CustomData == null) {
        //    $scope.object.CustomData = {};
        //}


        me.saveAttachmentMessage = function (url, message) {

            $http.post("/support/" + $scope.object.SaleOrderIdentifier + "/save/attachment/message", { Url: url, Message: message })
                .then(function (success) {
                    alert("Sucess!");
                }, function (error) {
                    alert(error.message);
                });

        }

        me.showTransferInfo = function () {

            swal(window.bankInfo);

        };
    });

    mod.filter('newline', function ($sce) {

        return function (input) {
            return $sce.trustAsHtml(input.replace(/\n/g, "<br/>"));
        }
    });


})();