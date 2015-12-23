'use strict';

var fs = require('fs');
var program = require('commander');
var GoogleMapsAPI = require('googlemaps');

var geocodeParams = {
  language: 'ja',
  region: 'ja'
};

program
  .version('0.0.1')
  .option('-k, --key [Google API Key]', 'Specify Google API Key')
  .option('-f, --file [File Name]', 'Specify target file name to convert.')
  .parse(process.argv);

if(!program.file || !program.key) {
  program.help();
  return;
}

var gapiConf = {
  key: program.key,
  secure: true
};
var gmAPI = new GoogleMapsAPI(gapiConf);

var data = JSON.parse(fs.readFileSync(program.file, 'utf-8'));
var outputFile = program.file + '.out';

function sequenceTasks(tasks) {
  function recordValue(results, value) {
    results.push(value);
    return results;
  }
  var pushValue = recordValue.bind(null, []);
  return tasks.reduce(function(promise, task) {
    return promise.then(task).then(pushValue);
  }, Promise.resolve());
}

function getLocation(data, i) {
  return function() {
    return new Promise(function(resolve, reject) {
      var address = data[i].address;
      geocodeParams.address = address;
      gmAPI.geocode(geocodeParams, function(err, result) {
        setTimeout(function() {
          if (err) {
            console.error('[' + i + ']', 'Parse failed: ', address);
            reject(err);
          } else {
            var location = result.results[0].geometry.location;
            console.log('[' + i + ']', location);
            data[i].location = {
              lat: location.lat,
              lon: location.lng
            };
            resolve(data[i]);
          }
        }, 1000);
      });
    });
  };
}

var tasks = [];

for (var i = 0; i < data.length; i++) {
  tasks.push(getLocation(data, i));
}

sequenceTasks(tasks).then((data) => {
  console.log('WriteFile: ', outputFile);
  console.log(data.length);
  fs.writeFileSync(outputFile, JSON.stringify(data), 'utf-8');
}).catch((e) => {
  console.error(e);
});
