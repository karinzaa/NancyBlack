﻿(function () {

    function addIcon(element, iconName) {

        var icon = $('<i></i>');

        if (iconName == null) {
            iconName = element.attr("ncb-icon");
        }

        if (iconName.indexOf("glyphicon-") == 0) {

            icon.addClass("glyphicon");
            icon.addClass(iconName);
        }

        if (iconName.indexOf("fa-") == 0) {

            icon.addClass("fa");
            icon.addClass(iconName);
        }

        if (element.is["ncb-right"]) {

            element.append(icon);
        } else {

            element.prepend(icon);
        }
    };

    function processFormElement(element) {
        // Bootstrap Setup
        element.addClass("form-control");

        // if parent is form-horizontal, do things differently
        if (element.closest("form").hasClass("form-horizontal")) {

            var labelCol = 3;
            if (element.is("[labelcol]")) {

                labelCol = element.attr("labelcol");
            }

            var inputCol = 12 - labelCol;
            var inputColumn = $();

            // no title, put offset
            if (element.is("[title]") == false) {

                element.wrap('<div class="col-xs-offset-' + inputCol + '"></div>');
                element.parent().wrap('<div class="form-group"></div>');


            } else {

                element.wrap('<div class="col-xs-' + inputCol + '"></div>');

                var label = $('<label class="control-label col-xs-' + labelCol + '"></label>');
                label.attr("for", element.attr("name"));
                label.text(element.attr("title"));

                element.parent().wrap('<div class="form-group"></div>');
                element.parent().parent().prepend(label);

            }

            if (element.is("[ncb-lg]")) {
                element.parent().parent().addClass("form-group-lg");
            }


        } else {

            element.wrap('<div class="form-group"></div>');

            if (element.is("[ncb-lg]")) {
                element.parent().addClass("form-group-lg");
            }

            if (element.is("[ncb-col]")) {
                element.parent().addClass(element.attr("ncb-col"));
            }

            // Label            
            if (element.is("[title]")) {

                var label = $('<label class="control-label"></label>');
                label.attr("for", element.attr("name"));
                label.text(element.attr("title"));
                element.before(label);
            }
        }


    }

    var module = angular.module('ncb-controls', ['ngTable']);

    // Take Picture and upload
    module.directive('ncbCameraOpen', function ($document, $timeout) {

        function link(scope, element, attrs) {

            var previewTarget = null;
            var previewModal = null;

            if (element.is("[previewtarget]") == false) {
                throw "previewtarget attribute is required";
                return;
            } else {

                previewTarget = element.attr("previewtarget");
            }

            if (element.is("[previewmodal]")) {

                previewModal = element.attr("previewmodal");
            }

            navigator.getUserMedia = (navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

            if (navigator.getUserMedia) {
                navigator.getUserMedia(

                   // constraints
                   {
                       video: true,
                       audio: false
                   },

                   // successCallback
                   function (localMediaStream) {

                       cameraStream = localMediaStream;

                       if (previewModal != null) {
                           $(previewModal).modal('show');
                       }

                       var video = $("#photoPreview")[0];                       
                       video.src = window.URL.createObjectURL(localMediaStream);                       
                       video.onloadedmetadata = function (e) {

                           video.play();
                           
                       };
                   },

                   // errorCallback
                   function (err) {

                       alert("ไม่สามารถเปิดกล้องได้ กรุณาใช้ Chrome หรือ Firefox" + err);
                   }
                );
            } else {

                alert("ไม่สามารถเปิดกล้องได้ กรุณาใช้ Chrome หรือ Firefox");
            }


        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // QR Scanner 3rd party but met issue with dependency injection.
    // https://github.com/sembrestels/angular-qr-scanner
    module.directive('qrScanner', ['$interval', '$window', function ($interval, $window) {
        return {
            restrict: 'E',
            scope: {
                ngSuccess: '&ngSuccess',
                ngError: '&ngError',
                ngVideoError: '&ngVideoError'
            },
            link: function (scope, element, attrs) {

                window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
                navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

                var height = attrs.height || 300;
                var width = attrs.width || 250;

                var video = $window.document.createElement('video');
                video.setAttribute('width', width);
                video.setAttribute('height', height);
                video.setAttribute('style', '-moz-transform:rotateY(-180deg);-webkit-transform:rotateY(-180deg);transform:rotateY(-180deg);');
                var canvas = $window.document.createElement('canvas');
                canvas.setAttribute('id', 'qr-canvas');
                canvas.setAttribute('width', width);
                canvas.setAttribute('height', height);
                canvas.setAttribute('style', 'display:none;');

                angular.element(element).append(video);
                angular.element(element).append(canvas);
                var context = canvas.getContext('2d');
                var stopScan;

                var scan = function () {
                    if ($window.localMediaStream) {
                        context.drawImage(video, 0, 0, 307, 250);
                        try {
                            qrcode.decode();
                        } catch (e) {
                            scope.ngError({ error: e });
                        }
                    }
                }

                var successCallback = function (stream) {
                    video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
                    $window.localMediaStream = stream;

                    scope.video = video;
                    video.play();
                    stopScan = $interval(scan, 500);
                }

                // Call the getUserMedia method with our callback functions
                if (navigator.getUserMedia) {
                    navigator.getUserMedia({ video: true }, successCallback, function (e) {
                        scope.ngVideoError({ error: e });
                    });
                } else {
                    scope.ngVideoError({ error: 'Native web camera streaming (getUserMedia) not supported in this browser.' });
                }

                qrcode.callback = function (data) {
                    scope.ngSuccess({ data: data });
                };

                element.bind('$destroy', function () {
                    if ($window.localMediaStream) {
                        $window.localMediaStream.stop();
                    }
                    if (stopScan) {
                        $interval.cancel(stopScan);
                    }
                });
            }
        }
    }]);

    // add 'active' class to A tags
    module.directive('ncbActive', function ($document) {

        function link(scope, element, attrs) {

            var url = element.attr("href");

            if (url == null) {
                return;
            }

            var urlMatch = window.location.href.indexOf(url) >= 0;
            if (urlMatch == true) {

                element.addClass("active");

            }

        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // more readable select
    module.directive('ncbSelect', function ($document, $timeout) {

        function link(scope, element, attrs) {

            processFormElement(element);
        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // A Shorter, leaner Input boxes
    module.directive('ncbTextbox', function ($document, $timeout) {

        function link(scope, element, attrs) {

            processFormElement(element);

            // Final touch ups
            if (element.is("[placeholder]") == false) {
                element.attr("placeholder", element.attr("title"));
            }
        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // A Shorter, leaner checkbox
    module.directive('ncbCheckbox', function ($document, $compile) {

        function link(scope, element, attrs) {

            var inputColumn = null;

            if (element.parent().is("[form-horizontal]")) {

                var group = $('<div class="form-group"></div>');

                if (element.is("[ncb-lg]")) {
                    group.addClass("form-group-lg");
                }

                var labelCol = 3;
                if (element.is("[labelcol]")) {

                    labelCol = element.attr("labelcol");
                }

                // Label            
                if (element.is("[title]")) {

                    var label = $('<label class="control-label col-xs-' + labelCol + '"></label>');
                    label.attr("for", element.attr("name"));
                    label.text(element.attr("title"));

                    group.append(label);
                }

                var inputCol = 12 - labelCol;
                inputColumn = $('<div class="col-xs-' + inputCol + '"></div>')
                group.append(inputColumn);

                // no title, put offset
                if (element.is("[title]") == false) {

                    inputColumn.addClass("col-xs-offset-" + labelCol);
                }
            }

            var parent = $('<div class="checkbox"></div>');
            var label = $('<label></label>');

            parent.append(label);

            element.before(parent);
            element.remove();

            label.append(element);

            if (element.is("[text]")) {

                var text = $('<span>' + element.attr("text") + '</span>');
                var compiled = $compile(text);

                compiled(scope);

                element.after(text);
            }

            if (inputColumn != null) {

                inputColumn.append(parent);
            }
        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // A Shorter, leaner radiobutton
    module.directive('ncbRadio', function ($document, $compile) {

        function link(scope, element, attrs) {

            var inputColumn = null;
            var label = $("<div class='radio'><label></label></div>")

            element.wrap(label);

            var text = element.attr("value");
            if (element.is("[text]") == true) {
                text = element.attr("text");
            }

            var span = $("<span></span>");
            span.text(text);

            element.after(span);
        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // add button into input box
    module.directive('ncbInputgroup', function ($document, $timeout, $compile) {

        function link(scope, element, attrs) {

            // Bootstrap Setup
            var inputGroup = $('<div class="input-group"></div>');
            var inputBtn = $('<span class="input-group-btn"></span>');
            element.wrap(inputGroup);

            var button = $('<button class="btn btn-default" type="button"></button>');
            inputBtn.append(button);

            if (element.is("[buttontype]")) {
                button.removeClass("btn-default");
                button.addClass(element.attr("buttontype"));
            }

            // Label            
            if (element.is("[before]")) {
                button.text(element.attr("before"));
                element.before(inputBtn);
            }

            if (element.is("[after]")) {
                button.text(element.attr("after"));
                element.after(inputBtn);
            }

            if (element.is("[icon]")) {
                addIcon(button, element.attr("icon"));
            }

            if (element.is("[btnclick]")) {
                button.attr("ng-click", element.attr("btnclick"));
            }

            var tpl = $compile(button);
            tpl(scope);
        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // A Shorter, leaner form-control-static
    module.directive('ncbFormstatic', function () {

        function link(scope, element, attrs) {

            if (element.parent().hasClass("form-horizontal") == false) {

                element.addClass("form-control-static");
            }

            // Bootstrap Setup
            processFormElement(element);

            element.removeClass("form-control");

        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // A Shorter, leaner bootstrap and font-awesome icons
    module.directive('ncbIcon', function () {

        function link(scope, element, attrs) {
            addIcon(element);
        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // Delete Button
    module.directive('ncbDel', function () {

        function link(scope, element, attrs) {

            element.removeAttr("ncb-del");
            element.attr("ncb-icon", "glyphicon-trash");
            element.addClass("btn");
            element.addClass("btn-danger");

            addIcon(element);
        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // Add Button
    module.directive('ncbAdd', function () {

        function link(scope, element, attrs) {

            element.removeAttr("ncb-add");

            element.attr("ncb-icon", "glyphicon-plus-sign");
            element.addClass("btn");
            element.addClass("btn-info");

            addIcon(element);

        }

        return {
            restrict: 'A',
            link: link
        };
    });

    // Add Button
    module.directive('ncbTab', function () {

        function link(scope, element, attrs) {

            var child = element.children().first();
            child.unwrap();

            child.attr("id", element.attr("id"));
            child.addClass(element.attr("class"));
            child.attr("style", element.attr("style"));
        }

        return {
            restrict: 'E',
            link: link,
            transclude: true,
            template: '<div class="tab-pane fade" ng-transclude></div>'
        };
    });

    // Date Picker Control
    module.directive('ncbDatepicker', function ($compile) {

        function link(scope, element, attrs) {

            if (element.is("[title]")) {

                element.find(".control-label").text(element.attr("title"));
            } else {

                element.find(".control-label").remove();
            }

            if (element.is("[placeholder]")) {

                element.find("input").attr("placeholder", element.attr("placeholder"));
            }

            if (element.is("[inline]")) {

                // inline mode - remove some property to make it compatible
                element.removeClass("form-group");

            } else {

                // if parent is form-horizontal, do things differently
                if (element.closest("form").hasClass("form-horizontal")) {
                    element.find("label").addClass("col-xs-3");

                    var container = $('<div class="col-xs-7 dropdown"></div>');
                    element.find("p.input-group").wrap(container);
                }
            }


            if ($(window).width() < 400) {

                element.find("input[placeholder='Date']").attr("type", "date");
                return;
            }

            scope.isopen = false;
            scope.opendatepicker = function ($event) {

                $event.preventDefault();
                $event.stopPropagation();

                scope.isopen = !scope.isopen;
            };

        }

        return {
            restrict: 'E',
            link: link,
            scope: {
                model: '=model',
                format: '=format'
            },
            replace: true,
            templateUrl: '/Modules/ControlsSystem/Templates/ncbDatePicker.html',
        };
    });

    // Date Picker Control
    module.directive('ncbSimpledatepicker', function ($compile) {

        function link($scope, element, attrs) {

            if (element.is("[title]")) {

                element.find("label").text(element.attr("title"));
            }

            $scope.object = {};
            $scope.object.BirthDate = new Date();
            $scope.object.Interests = {};

            $scope.oneTo31 = [];
            for (var i = 1; i <= 31; i++) {
                $scope.oneTo31.push(i);
            }

            $scope.oneTo12 = [];
            for (var i = 1; i <= 12; i++) {
                $scope.oneTo12.push(i);
            }

            $scope.years = [];

            var minYear = "-100";
            var maxYear = "-13";
            var startYear = (new Date()).getFullYear();

            if (element.is("[minYear]")) {

                minYear = element.attr("minYear");
            }

            if (element.is("[maxYear]")) {

                maxYear = element.attr("maxYear");
            }

            if (element.is("[startYear]")) {

                startYear = element.attr("startYear");
            }

            minYear = eval(startYear + minYear);
            maxYear = eval(startYear + maxYear);

            for (var i = maxYear; i >= minYear; i--) {
                $scope.years.push(i);
            }

            $scope.tempDate = (new Date()).getDate();
            $scope.tempMonth = (new Date()).getMonth();
            $scope.tempYear = startYear;
        }

        return {
            restrict: 'E',
            link: link,
            scope: {
                model: '=model',
            },
            templateUrl: '/Modules/ControlsSystem/Templates/ncbSimpleDatePicker.html',
        };
    });

    // Modal Dialog
    module.directive('ncbModal', ['$compile', function ($compile) {

        function link(scope, element, attrs) {

            if (element.is("[closebutton]") == false) {
                element.find("button.close").remove();
            }

            if (element.is("[lg]")) {
                element.find(".modal-dialog").addClass("modal-lg");
            }

            if (element.is("[sm]")) {
                element.find(".modal-dialog").addClass("modal-sm");
            }

            if (element.is("[deletebutton]") == false) {
                element.find("button.ncb-modal-delete").css("visibility", "collapse");
            }
            else {

                if (attrs.ondelete != null) {

                    $("button.ncb-modal-delete").on("click", function () {

                        scope.$apply(function () {

                            scope.$eval(attrs.ondelete);
                        });
                    });

                } else {

                    if (scope.data != null) {

                        $("button.ncb-modal-delete").on("click", function () {

                            scope.$apply(function () {

                                scope.data.delete(scope.object, function () {

                                    $(element).modal('hide');
                                });
                            });
                        });
                    } else {

                        element.find("button.ncb-modal-delete").remove(); // button is not bound
                    }
                }
            }

            if (attrs.deletebutton != "") {

                scope.$watch(attrs.deletebutton, function (newValue) {

                    if (newValue == true) {
                        element.find("button.ncb-modal-delete").css("visibility", "visible");
                    } else {

                        element.find("button.ncb-modal-delete").css("visibility", "collapse");
                    }
                });
            }

            if (attrs.onshow != "") {

                element.on('shown', function () {

                    scope.$eval(attrs.onshow);
                })
            }

            if (attrs.onhidden != "") {

                element.on('hidden', function () {

                    scope.$eval(attrs.onhidden);
                })
            }

            var title = element.find("h2.modal-title");
            if (element.is("[title]") == false) {
                title.remove();
            } else {
                title.text(element.attr("title"));

                var titleTpl = $compile(title);
                titleTpl(scope);
            }

            if (element.find(".modal-header").children().length == 0) {
                element.find(".modal-header").remove();
            }

            var footer = element.find("ncb-footer").remove();
            if (footer.length > 0) {
                var footerTpl = $compile(footer);
                footerTpl(scope);
            }
            element.find(".modal-footer").append(footer);

            if (element.find(".modal-footer").children().length == 0) {
                element.find(".modal-footer").remove();
            }
        }

        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: false, // integrates into scope
            templateUrl: '/Modules/ControlsSystem/Templates/ncbModal.html',
            link: link
        };
    }]);

    // JSON Editor
    module.directive('ncbJsonedit', function () {

        function link(scope, element, attrs) {

            var included = $("script[src*='jsoneditor.min.js']").length > 0;
            if (included == false) {

                throw "jsoneditor.min.js was not included";
            }

            var $me = this;
            $me.editor = new JSONEditor(element[0], {
                change: function () {

                    scope.$apply(function () {

                        scope.$eval($me.expression + "=" + $me.editor.getText());
                    });
                }
            });
            $me.expression = attrs.model;

            $me.refreshData = function () {

                var value = scope.$eval($me.expression);

                if (value == null) {

                    value = {};
                }
                $me.editor.set(value);
            };

            if (attrs.watch == null) {

                scope.$watch($me.expression, $me.refreshData);
            } else {

                scope.$watch(attrs.watch, $me.refreshData);
            }

            scope.$watch($me.expression, $me.refreshData);
            $me.refreshData();
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    // from https://github.com/cgarvis/angular-toggle-switch

    module.provider('toggleSwitchConfig', [function () {
        this.onLabel = 'On';
        this.offLabel = 'Off';
        this.knobLabel = '\u00a0';

        var self = this;
        this.$get = function () {
            return {
                onLabel: self.onLabel,
                offLabel: self.offLabel,
                knobLabel: self.knobLabel
            };
        };
    }]);

    // on-off button
    module.directive('ncbOnoff', ['toggleSwitchConfig', function (toggleSwitchConfig) {
        return {
            restrict: 'EA',
            replace: true,
            require: 'ngModel',
            scope: {
                disabled: '@',
                onLabel: '@',
                offLabel: '@',
                knobLabel: '@',
            },
            template: '<div role="radio" class="toggle-switch" ng-class="{ \'disabled\': disabled }">' +
                '<div class="toggle-switch-animate" ng-class="{\'switch-off\': !model, \'switch-on\': model}">' +
                '<span class="switch-left" ng-bind="onLabel"></span>' +
                '<span class="knob" ng-bind="knobLabel"></span>' +
                '<span class="switch-right" ng-bind="offLabel"></span>' +
                '</div>' +
                '</div>',
            compile: function (element, attrs) {
                if (!attrs.onLabel) { attrs.onLabel = toggleSwitchConfig.onLabel; }
                if (!attrs.offLabel) { attrs.offLabel = toggleSwitchConfig.offLabel; }
                if (!attrs.knobLabel) { attrs.knobLabel = toggleSwitchConfig.knobLabel; }

                return this.link;
            },
            link: function (scope, element, attrs, ngModelCtrl) {
                var KEY_SPACE = 32;

                element.on('click', function () {
                    scope.$apply(scope.toggle);
                });

                element.on('keydown', function (e) {
                    var key = e.which ? e.which : e.keyCode;
                    if (key === KEY_SPACE) {
                        scope.$apply(scope.toggle);
                    }
                });

                ngModelCtrl.$formatters.push(function (modelValue) {
                    return modelValue;
                });

                ngModelCtrl.$parsers.push(function (viewValue) {
                    return viewValue;
                });

                ngModelCtrl.$viewChangeListeners.push(function () {
                    scope.$eval(attrs.ngChange);
                });

                ngModelCtrl.$render = function () {
                    scope.model = ngModelCtrl.$viewValue;
                };

                scope.toggle = function toggle() {
                    if (!scope.disabled) {
                        scope.model = !scope.model;
                        ngModelCtrl.$setViewValue(scope.model);

                        scope.$parent.$eval(attrs.changed);
                    }
                };
            }
        };
    }]);

    // add 'active' class to menu
    module.directive('ncbMenu', function () {

        function link(scope, element, attrs) {

            var activeClass = attrs.activeclass;
            if (activeClass == null) {

                activeClass = "active";
            }

            var currentUrl = window.location.pathname;
            element.find("a").each(function () {

                var current = $(this);
                var url = current.attr("href");

                var match = currentUrl.indexOf(url) >= 0;
                if (currentUrl == "/" || url == "/") {

                    match = (url == currentUrl);
                }

                // starts with path name
                if (match == true) {

                    if (attrs.applyto != null) {

                        current.parents(attrs.applyto).addClass(activeClass);
                        current.find(attrs.applyto).addClass(activeClass);

                    }
                    current.addClass(activeClass);
                    current.parent('li').addClass(activeClass);
                }
            });
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    // make the element support drop event with ease
    module.directive('ncbDropable', function () {

        function link(scope, element, attrs) {

            if (attrs.whendrop == null) {

                throw "whendrop attribute is required.";
            }

            var enterClass = attrs.enterclass;
            if (enterClass == null) {
                enterClass = "hintdrop";
            }

            var handleEnter = function (e) {
                e.stopPropagation();
                e.preventDefault();
                element.addClass(enterClass);
            };
            var cancel = function (e) {
                e.stopPropagation();
                e.preventDefault();
            };

            element.on('dragenter', handleEnter);
            element.on('dragover', cancel);

            element.on('drop', function (e) {

                e.preventDefault();

                var fn = scope.$eval(attrs.whendrop);
                if (fn == null) {

                    throw attrs.whendrop + " does not resolve to function";
                }
                fn(e.originalEvent.dataTransfer.files);

            });
            element.on('dragleave', function (e) {

                cancel(e);
                element.removeClass(enterClass);

            });


        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    // insert background image with css
    module.directive('ncbBackground', function () {

        function link(scope, element, attrs) {

            element.css("background-image", "url('" + attrs.ncbBackground + "')");

            try {

                scope.$eval(attrs.ncbBackground);

                // Watch for background's change 
                scope.$watch(attrs.ncbBackground, function (newVal, oldVal) {
                    element.css("background-image", "url('" + newVal + "')");
                })

            } catch (e) {

                // if expression is error...
                console.warn("ncbBackground : Expression is not watchable. So I won't watch it");
            }


        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    // toggle other element class on click
    module.directive('ncbToggle', function () {

        function link(scope, element, attrs) {

            if (element.data("on") == null) {

                throw "on attribute is required";
            }

            if (attrs.ncbToggle == "") {

                throw "ncbToggle value is required";
            }

            element.on("click", function (e) {

                if (element.attr("href") == "#" || attrs.stop != null) {
                    e.preventDefault();
                }

                if (element.data("clear") != null) {

                    $(element.data("clear")).removeClass(attrs.ncbToggle);
                }

                $(element.data("on")).toggleClass(attrs.ncbToggle);
            });

            element.on("blur", function (e) {

                $(element.data("on")).toggleClass(attrs.ncbToggle);
            });
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbClosealert', function () {

        function link(scope, element, attrs) {

            if (scope.closeAlert == null) {

                scope.closeAlert = function (index) {
                    scope.alerts.splice(index, 1);
                };
            }
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbNgtable', [function () {

        function link($scope, element, attrs) { //controllers

            // Best practice to destroy its own directive.
            $scope.$on('$destroy', function () {
                // Do someting to prevent memory leak
            });

            $scope.alwaysfilter = attrs.alwaysfilter;
            $scope.defaultSort = attrs.defaultsort;

            if (attrs.reloadwatch != null) {
                $scope.$parent.$watch(attrs.reloadwatch, function () {

                    $scope.tableParams.reload();
                });
            }
        }

        // Use for connect to other API or Component.
        function controller($scope, $http, ngTableParams, $rootScope) {

            var _tableName = $scope.$parent.table.getTableName();
            var _normalizedTableName = _tableName.toLowerCase();

            $scope.modalId = _tableName + "Modal";
            $scope.tablename = _normalizedTableName;

            $scope.object = $scope.$parent.object;
            $scope.data = $scope.$parent.data;

            $scope.cols = []; // ng-table-dynamic    
            $scope.filters = {};

            // Watch for edit data;
            $scope.$parent.$watch('object', function (newVal, oldVal) {
                if (newVal != null) {
                    $scope.object = $scope.$parent.object;
                }
            });

            $scope.tableParams = new ngTableParams({
                page: 1,            // show first page
                count: 10,          // count per page
                sorting: { __updatedAt: 'asc' },
                filter: $scope.filters // initial filters
            }, {
                total: 0, // length of data
                getData: _GetData
            });

            //#region Reload on data change
            {
                var reload = function () {

                    $scope.tableParams.reload();
                };

                $rootScope.$on("updated", reload);
                $rootScope.$on("inserted", reload);
                $rootScope.$on("deleted", reload);
                $rootScope.$on("ncb-datacontext.deleted", reload);
            }


            if ($scope.tableTemplateId == null) {
                _GetDataType();
            }

            function _GetData($defer, params) {

                var oDataQueryParams = _oDataAddFilterAndOrder(params);

                $scope.$parent.data.inlinecount(oDataQueryParams, function (data) {
                    $defer.resolve(data.Results);
                    params.total(data.Count);
                });

            };

            function _oDataAddFilterAndOrder(params) {

                var oDataQueryParams = '';

                var _filter = params.filter();
                var _sorting = params.sorting();
                var _pageNum = params.page();
                var _pageSize = params.count();

                var _takeV = 10;
                var _skipV = 0;

                // OrderBy
                for (var property in _sorting) {
                    var _sortOrder = _sorting[property];
                    oDataQueryParams += '$orderby=' + property + ' ' + _sortOrder;
                }

                // Filters
                var _arrFilters = [];
                for (var property in _filter) {
                    var _filterAttr = _filter[property];

                    if (_filterAttr == null || _filterAttr == "") {
                        continue;
                    }

                    var _strFilter = "";

                    _strFilter = "contains(" + property + ",'" + _filterAttr + "')";

                    _arrFilters.push(_strFilter);
                }

                // Always filter...
                if ($scope.alwaysfilter != null) {

                    var filter = null;
                    try {
                        filter = $scope.$eval($scope.alwaysfilter);
                    } catch (e) {
                        filter = $scope.alwaysfilter;
                    }

                    if (filter == '' || filter == null) {

                    } else {

                        _arrFilters.push(filter);
                    }
                }

                if (_arrFilters.length > 0) {
                    var _baseQuery = "&$filter=";
                    var _joinFilters = _arrFilters.join(" and ");
                    oDataQueryParams += _baseQuery + _joinFilters;
                }

                // Skip & Take
                _takeV = _pageSize;
                _skipV = (_pageNum * _pageSize) - _pageSize;

                oDataQueryParams += "&$skip=" + _skipV + "&$top=" + _takeV;

                // InlineCount
                oDataQueryParams += '&$inlinecount=allpages';

                return oDataQueryParams;

            };

            function _GetDataType() {
                $http.get('/tables/datatype/' + _normalizedTableName).
                  then(function (response) {

                      var _DataType = response.data;
                      $scope.cols = _AddDynamicColumns(_DataType.Properties);

                  }, function (response) {
                      // TODO
                      // called asynchronously if an error occurs
                      // or server returns response with an error status.
                  });
            };

            function _AddDynamicColumns(Properties) {

                var _arrDisplayColumns = [];

                Properties.forEach(function (_Property) {

                    if (_Property.Name == undefined || _Property.Name == null) {

                        console.error("NcbNgTable dynamic column error on property", _Property)

                    } else {

                        var _dbField = null;
                        if (_Property.Name == "Id") {
                            _dbField = 'id';
                        }
                        var _colObj = _CreateColumnObject(_Property.Name, _Property.Type, _dbField);
                        _arrDisplayColumns.push(_colObj);

                    }

                });

                // Push Action column
                var _editObj = _CreateColumnObject(
                        "Actions",
                        "Actions",
                            null);

                _arrDisplayColumns.push(_editObj);

                return _arrDisplayColumns;

            };

            function _CreateColumnObject(name, dataType, dbField) {

                var filterKey = dbField == null ? name : dbField;

                var filter = {
                };
                // Action column should not has a filter
                if (filterKey != "Actions" && filterKey.toLowerCase() != "id") {
                    filter[filterKey] = 'text';
                }

                return {
                    title: name,
                    sortable: name,
                    filter: filter,
                    show: true,
                    datatype: dataType,
                    field: filterKey
                };
            };

        };

        return {
            restrict: 'E', // To use <ncb-ngtable></ncb-ngtable>
            //require: ['^myTabs', '^ngModel'], //Required for specified controller 
            link: link, // Link to DOM            
            scope: { // This scope is binding to template
                tableTemplateId: '=tabletemplate',
                modalTemplateId: '=modaltemplate',
                modalId: '=modalid',
                editFn: '&editFn',
            },
            templateUrl: '/Modules/ControlsSystem/Templates/ncbNgtable.html',
            controller: controller,
            //replace: true,
            // It's like this directive is a mask and allowed the controller passed the value through template.
            // In the other hand the value does not pass the isolate scope.
            // eg. Controller: $scope.name = "A"; Template: Print {{A}} Man.
            //transclude: true,             
            //controllerAs: "",

        };
    }]);

    module.directive('ncbRunningnumber', function () {

        function link(scope, element, attrs) {

            var value = parseInt(attrs.start);
            var stop = parseInt(attrs.end);

            if (isNaN(value) == true) {
                value = stop - 100;
            }

            if (value < 0) {
                value = 0;
            }

            var text = String.format("{0:0,0}", value);
            element.text(text);

            var handle = window.setInterval(function () {

                value = value + 1;

                if (value >= stop) {
                    window.clearInterval(handle);
                    value = stop;
                }

                var text = String.format("{0:0,0}", value);
                element.text(text);

                if (value >= stop) {
                    window.clearInterval(handle);
                }

            }, 100);
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbParallax', function () {

        function link(scope, element, attrs) {

            var $window = $(window);
            var ratio = parseFloat(attrs.ncbParallax);
            var offset = parseFloat(attrs.offset);
            var last = $window.scrollTop();

            if (isNaN(ratio)) {
                ratio = 0.2;
            }

            if (isNaN(offset)) {
                offset = 0;
            }

            var update = function () {

                var top = $window.scrollTop();
                var diff = top - last;

                element.css("background-position", "center " + (offset - (diff * ratio * -1)) + "px");

            };

            $window.on("scroll", update);
            update();
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbFillheight', function () {

        function link(scope, element, attrs) {

            var $window = $(window);

            if (attrs.minheight != null) {
                element.css("min-height", attrs.minheight);
            }

            var scale = 1;
            if (attrs.scale != null) {
                scale = parseFloat(attrs.scale);
            }

            if (attrs.ncbFillheight != "") {
                scale = parseFloat(attrs.ncbFillheight);
            }

            var offset = 0;
            if (attrs.offset != null) {
                offset = parseFloat(attrs.offset);
            }

            var updateHeight = function () {

                element.css("height", ($window.height() * scale) + offset);
            };

            $window.on("resize", updateHeight);
            updateHeight();
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbFillwidth', function () {

        function link(scope, element, attrs) {

            var $window = $(window);


            var offset = 0;
            if (attrs.ncbFillwidth != "") {
                offset = parseFloat(attrs.ncbFillwidth);
            }

            var update = function () {

                element.css("width", $window.width() + offset);
            };

            $window.on("resize", update);
            update();
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbFixedmenu', function ($window) {

        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = '.ncb-fixedmenu-fixed { width: 100%; position: fixed; top: 0; left: 0; z-index: 9999 }';
        document.getElementsByTagName('head')[0].appendChild(style);
        
        function link(scope, element, attrs) {

            if (attrs.fixedclass == null) {
                attrs.fixedclass = "ncb-fixedmenu-fixed";
            }

            var $window = $(window);
            var myHeight = element.offset().top;
            var nextElement = element.next();

            $window.on("scroll", function () {

                var top = $window.scrollTop();
                if (top > myHeight) {
                    element.addClass(attrs.fixedclass);
                    nextElement.css("margin-top", element.height() + "px");
                } else {
                    element.removeClass(attrs.fixedclass);
                    nextElement.css("margin-top", "0px");
                }
            });
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    // Add class to target when scroll pass specified element
    module.directive('ncbScrollpass', function ($window) {

        function link(scope, element, attrs) {

            if (attrs.ncbScrollpass == null) {
                throw "ncbScrollpass attribute is required";
            }

            var target = element;
            if (attrs.target != null) {
                target = $(attrs.target);
            }

            var $window = $(window);
            var myHeight = element.offset().top;

            if (attrs.scrollbox != null) {

                $window = $(attrs.scrollbox);

                $window.on("scroll", function () {

                    var top = $window.scrollTop();
                    if (top > myHeight) {
                        target.addClass(attrs.ncbScrollpass);
                        target.css("top", top - myHeight);

                    } else {
                        target.removeClass(attrs.ncbScrollpass);
                        target.css("top", "0");
                    }
                });

            } else {

                $window.on("scroll", function () {

                    var top = $window.scrollTop();
                    if (top > myHeight) {
                        target.addClass(attrs.ncbScrollpass);
                    } else {
                        target.removeClass(attrs.ncbScrollpass);
                    }
                });
            }

        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbScroll', function () {

        function link(scope, element, attrs) {

            if (attrs.href.indexOf("#") != 0)
                return;

            var targetOffset = 0;
            if (attrs.href == "#top") {
                // offset is 0
            }
            else {

                var target = $(attrs.href);
                if (target.length == 0) {
                    return;
                }

                targetOffset = target.offset().top;
            }

            element.on("click", function (e) {

                e.preventDefault();

                $("html, body").animate({ scrollTop: targetOffset + "px" });
            });
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbScrolltop', function () {

        function link(scope, element, attrs) {

            var targetOffset = 0;
            element.on("click", function (e) {

                e.preventDefault();
                $("html, body").animate({ scrollTop: targetOffset + "px" });
            });
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbEnter', function () {

        function link(scope, element, attrs) {

            if (attrs.ncbEnter == null)
                throw "Value to evaluate is required."

            element.on("keyup", function (e) {

                if (e.key == "Enter") {
                    scope.$eval(attrs.ncbEnter);
                }
            });
        }

        return {
            restrict: 'A',
            link: link,
        };
    });

    module.directive('ncbFormlocator', function () {
        return {
            link: function (scope, element) {
                scope.$emit('formLocator', element);
            }
        };
    });

    module.directive('ncbAlerts', function ($http) {

        function link($scope, element, attrs) {

            $scope.alerts = $scope.$parent.$eval(attrs.alerts);

            $scope.closeAlert = function (index) {

                $scope.alerts.splice(index, 1);
            };
        }

        return {
            restrict: 'E',
            templateUrl: '/Modules/ControlsSystem/Templates/ncbAlerts.html',
            link: link,
            replace: true,
            scope: true,
        };
    });

    var resizeWatch = null;
    var resizeList = [];
    module.directive('ncbResize', function () {

        function link($scope, element, attrs) {

            if (attrs.ncbResize == null) {

                throw "ncb-resize attribute value is URL to resize";
            }

            if (resizeWatch == null) {

                resizeWatch = $(window).on("resize", function () {

                    resizeList.forEach(function (item) {

                        item();
                    });
                });
            }

            function updateUrl(url) {

                if (url == null) {
                    return;
                }
                var lastSrc = element.attr("src");

                var finalUrl = "/__resize" + url + "?";

                if (attrs.width != null && attrs.width != "") {

                    var w = attrs.width;
                    if (w == "100%") {
                        w = element.width();
                    }

                    finalUrl += String.format("w={0}&",
                                    w
                                );
                }

                if (attrs.height != null && attrs.height != "") {

                    var h = attrs.height;
                    if (h == "100%") {
                        h = element.height();
                    }

                    finalUrl += String.format("h={0}&",
                                    attrs.height
                                );
                }

                if (attrs.width == null && attrs.height == null ) {

                    finalUrl += String.format("w={0}&h={1}",
                                    element.width(),
                                    element.height()
                                );
                }

                if (attrs.width == "" && attrs.height == "") {

                    finalUrl += String.format("w={0}&h={1}",
                                    element.width(),
                                    element.height()
                                );
                }
                
                if (attrs.mode) {

                    finalUrl += String.format("&mode={0}",
                                    attrs.mode
                                );
                }

                if (lastSrc == finalUrl) {
                    return;
                }

                window.setTimeout(function () {

                    var heavyImage = new Image();
                    heavyImage.src = finalUrl;
                    heavyImage.onload = function () {
                        element.attr("src", finalUrl);
                    };

                }, Math.random() * 2000);
            }

            if (attrs.ncbResize.indexOf('/') != 0) {
                // needs to watch, it is not a url
                $scope.$parent.$watch(attrs.ncbResize, updateUrl);
            } else {

                updateUrl(attrs.ncbResize);
            }

            if (attrs.once == null) {

                resizeList.push(function () {

                    var url = attrs.ncbResize;
                    if (url.indexOf('/') != 0) {
                        url = $scope.$parent.$eval(attrs.ncbResize);
                    }

                    updateUrl(url);
                });
            }
        }

        return {
            restrict: 'A',
            link: link,
            scope: true,
        };
    });

    module.directive('ncbZoomtoo', function () {

        if ($("body").zoomToo == null) {

            (function ($) {
                var ZoomToo;
                ZoomToo = function (element, options) {
                    this.element = element;
                    this.load(options);
                };
                ZoomToo.defaults = {
                    showDuration: 500,
                    moveDuration: 1200,
                    magnify: 1,
                    lensWidth: 200,
                    lensHeight: 200
                };
                ZoomToo.prototype = {
                    load: function (options) {
                        var img_src, nestedImage;
                        nestedImage = this.element.find("img").first();
                        img_src = nestedImage.data("src");
                        this.element.one("zoomtoo.destroy", $.proxy(this.destroy, this));
                        if (!img_src) {
                            return;
                        }
                        this.img = new Image();
                        this.img.src = img_src;
                        this.img.onload = $.proxy(this.init, this, options);
                    },
                    init: function (options) {
                        var position;
                        position = this.element.css("position");
                        this.settings = $.extend({}, ZoomToo.defaults, options);
                        this.element.get(0).style.position = /(absolute|fixed)/.test(position) ? position : "relative";
                        this.element.get(0).style.overflow = "hidden";
                        this.elementWidth = this.element.outerWidth();
                        this.elementHeight = this.element.outerHeight();
                        this.imgWidth = this.img.width * this.settings.magnify;
                        this.imgHeight = this.img.height * this.settings.magnify;
                        this.elementOffset = this.element.offset();
                        this.newZoom = {
                            left: 0,
                            top: 0
                        };
                        this.currentZoom = {
                            left: 0,
                            top: 0
                        };
                        this.moveImageTimer = 0;
                        this.continueSlowMove = false;
                        this.prepareElements();
                    },
                    prepareElements: function () {
                        $(this.img).css({
                            position: "absolute",
                            top: 0,
                            left: 0,
                            opacity: 0,
                            width: this.imgWidth,
                            height: this.imgHeight,
                            border: "none",
                            maxWidth: "none",
                            maxHeight: "none"
                        }).appendTo(this.element);
                        this.element.css({
                            cursor: "crosshair"
                        }).on("mouseenter.zoomtoo", $.proxy(this.mouseEnter, this)).on("mouseleave.zoomtoo", $.proxy(this.mouseLeave, this)).on("mousemove.zoomtoo", $.proxy(this.mouseMove, this));
                    },
                    destroy: function () {
                        this.cancelTimer();
                        this.element.off();
                        $(this.img).remove();
                        this.element.removeData("zoomtoo");
                    },
                    calculateOffset: function (currentMousePos) {
                        var adjustedHeight, adjustedWidth, currentMouseOffsetX, currentMouseOffsetY, deltaHeight, deltaWidth, halfLensHeight, halfLensWidth, lensBottom, lensLeft, lensRight, lensTop, zoomLeft, zoomTop;
                        currentMouseOffsetX = currentMousePos.x - this.elementOffset.left;
                        currentMouseOffsetY = currentMousePos.y - this.elementOffset.top;
                        halfLensHeight = Math.round(this.settings.lensHeight / 2);
                        halfLensWidth = Math.round(this.settings.lensWidth / 2);
                        lensTop = currentMouseOffsetY - halfLensHeight;
                        lensBottom = currentMouseOffsetY + halfLensHeight;
                        lensLeft = currentMouseOffsetX - halfLensWidth;
                        lensRight = currentMouseOffsetX + halfLensWidth;
                        if (lensTop < 0) {
                            currentMouseOffsetY = halfLensHeight;
                        }
                        if (lensBottom > this.elementHeight) {
                            currentMouseOffsetY = this.elementHeight - halfLensHeight;
                        }
                        if (lensLeft < 0) {
                            currentMouseOffsetX = halfLensWidth;
                        }
                        if (lensRight > this.elementWidth) {
                            currentMouseOffsetX = this.elementWidth - halfLensWidth;
                        }
                        deltaHeight = this.imgHeight - this.elementHeight;
                        adjustedHeight = this.elementHeight - this.settings.lensHeight;
                        deltaWidth = this.imgWidth - this.elementWidth;
                        adjustedWidth = this.elementWidth - this.settings.lensWidth;
                        zoomTop = -deltaHeight / adjustedHeight * (currentMouseOffsetY - halfLensHeight);
                        zoomLeft = -deltaWidth / adjustedWidth * (currentMouseOffsetX - halfLensWidth);
                        this.newZoom.left = zoomLeft;
                        this.newZoom.top = zoomTop;
                    },
                    cancelTimer: function () {
                        clearTimeout(this.moveImageTimer);
                    },
                    stopSlowMoveImage: function () {
                        this.continueSlowMove = false;
                    },
                    mouseLeave: function () {
                        $(this.img).stop().fadeTo(this.settings.showDuration, 0).promise().done(this.stopSlowMoveImage);
                    },
                    mouseEnter: function (e) {
                        var currentMousePos;
                        currentMousePos = {
                            x: e.pageX,
                            y: e.pageY
                        };
                        this.calculateOffset(currentMousePos);
                        this.continueSlowMove = true;
                        this.currentZoom.top = this.newZoom.top;
                        this.currentZoom.left = this.newZoom.left;
                        this.moveImage();
                        $(this.img).stop().fadeTo(this.settings.showDuration, 1);
                    },
                    mouseMove: function (e) {
                        var currentMousePos;
                        currentMousePos = {
                            x: e.pageX,
                            y: e.pageY
                        };
                        this.calculateOffset(currentMousePos);
                        this.cancelTimer();
                        this.continueSlowMove = true;
                        this.slowMoveImage();
                    },
                    slowMoveImage: function () {
                        var delta, moveZoomPos, reachedLeft, reachedTop;
                        delta = {
                            left: 0,
                            top: 0
                        };
                        moveZoomPos = {
                            left: 0,
                            top: 0
                        };
                        reachedLeft = false;
                        reachedTop = false;
                        delta.left = this.newZoom.left - this.currentZoom.left;
                        delta.top = this.newZoom.top - this.currentZoom.top;
                        moveZoomPos.left = -delta.left / (this.settings.moveDuration / 100);
                        moveZoomPos.top = -delta.top / (this.settings.moveDuration / 100);
                        this.currentZoom.left = this.currentZoom.left - moveZoomPos.left;
                        this.currentZoom.top = this.currentZoom.top - moveZoomPos.top;
                        if (Math.abs(delta.left) < 1) {
                            this.currentZoom.left = this.newZoom.left;
                            reachedLeft = true;
                        }
                        if (Math.abs(delta.top) < 1) {
                            this.currentZoom.top = this.newZoom.top;
                            reachedTop = true;
                        }
                        this.moveImage();
                        if (reachedLeft && reachedTop) {
                            this.continueSlowMove = false;
                        }
                        if (this.continueSlowMove === true) {
                            this.moveImageTimer = setTimeout($.proxy(this.slowMoveImage, this), 25);
                        }
                    },
                    moveImage: function () {
                        this.img.style.left = this.currentZoom.left + "px";
                        this.img.style.top = this.currentZoom.top + "px";
                    }
                };
                $.fn.zoomToo = function (options) {
                    this.each(function () {
                        var instance;
                        instance = $.data(this, "zoomtoo");
                        if (!instance) {
                            $.data(this, "zoomtoo", new ZoomToo($(this), options));
                        }
                    });
                };
            })(window.jQuery);
        }
        
        function link($scope, element, attrs) {

            $(element).zoomToo({
                magnify: 1
            });
        };

        return {
            restrict: 'A',
            link: link,
            scope: true,
        };
    });

    module.directive('ncbSlidetoggle', function () {

        function link($scope, element, attrs) {

            if (attrs.ncbSlidetoggle == null) {

                throw "Requires value to watch";
            }

            $scope.$watch(attrs.ncbSlidetoggle, function (down) {

                if (down) {

                    $(element).slideDown();
                    $(element).addClass("in");
                    $(element).removeClass("out");

                } else {

                    $(element).slideUp();
                    $(element).addClass("out");
                    $(element).removeClass("in");
                }

            });
        };

        return {
            restrict: 'A',
            link: link,
            scope: false,
        };
    });

    module.directive('ncbGooglemap', function ($timeout) {

        function link($scope, element, attrs) {
            
            var key = "AIzaSyBukXJXrbWiLKMB2Hgo5AqxYKPTatB9iH0";
            if (attrs.key != null) {
                key = attrs.key;
            }

            if (attrs.place == null) {
                throw "Require place parameter";
            }

            var iframe = $('<iframe></iframe>');
            var url = String.format( 'https://www.google.com/maps/embed/v1/place?q={0}&key={1}',
                encodeURIComponent(attrs.place),
                key);

            iframe.css( "width", "100%" );
            iframe.css( "height", element.height() );
            iframe.attr( "frameborder", "0");
            
            if (attrs.fullscreen) {
                iframe.attr("allowfullscreen", "allowfullscreen");
            }

            iframe.appendTo(element);
            $timeout(function () {

                iframe.attr("src", url);

            }, 1000);
        };

        return {
            restrict: 'A',
            link: link,
            scope: false,
        };
    });

    
})();
