angular.module('mainApp')
    .directive('fileSelected', [function () {
        return {
            restrict: 'A',
            scope: {
                callBack: '&fileSelected'
            },
            link: function (scope, elem, attr) {
                var func = attr.fileSelected
                if (func) {
                    elem.on("change", function (e) {
                        var files = e.target.files
                        scope.callBack({ files: files });
                    });
                }
            }
        }
    }])
    .factory('fileUploads', [function () {
        /* upload job object
         * url - url to take this upload
         * file - file object
         * target path - target path to save this file
         * status - 'pending' 'inProgress' 'succeed' 'failed'
         * uploadPercentage -
         * onCompleted - callback function when upload is completed
         * onProgress - callback function when  uploadPercentage get updated
        */


        var jobs = [];
        var maxJobCount = 5;
        var jobCount = 0;
        
        function runJob(job) {
            jobCount++;
            var formData = new FormData();
            formData.append('targetPath', job.target);
            formData.append('file', job.file, job.file.name);
            var xhr = new XMLHttpRequest();
            
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        job.status = 'succeed';
                    }
                    else {
                        job.status = 'failed';
                    }

                    if (job.onCompleted) {
                        job.onCompleted(job);
                    }
                    jobCount--;
                    scheduleJob();
                }
            }
            
            if (xhr.upload) {
                xhr.upload.onprogress = function (e) {
                    var done = e.position || e.loaded;
                    var total = e.totalSize || e.total;
                    job.uploadPercentage = Math.floor(done / total * 1000) / 10;
                    if (job.onProgress) {
                        job.onProgress(job);
                    }
                };
            }

            xhr.open('post', job.url, true);
            //xhr.setRequestHeader("Content-type", "multipart/form-data");
            xhr.send(formData);

            job.uploadPercentage = 0
            job.status = 'inProgress';
            if (job.onProgress) {
                job.onProgress(job);
            }
        }

        function scheduleJob() {
            if (jobs.length > 0) {
                if (jobCount < maxJobCount) {
                    var job = jobs.shift();
                    runJob(job);
                }
            }
        }


        return {
            addUploadJob: function (url, target, file) {
                var job = {
                    url: url,
                    target: target,
                    file: file,
                    status : 'pending',
                    uploadPercentage : 0
                };
                jobs.push(job);
                scheduleJob();
                return job
            },
            
            retryJob:function(job){
                job.status = 'pending';
                jobs.push(job);
                scheduleJob();
                return job;
            }
        }
    }])