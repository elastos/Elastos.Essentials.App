"use strict";

module.exports = function(ctx) {
    // console.log(JSON.stringify(ctx, null, 2));

    const fs = require('fs'),
        exec = require('child_process').exec;

    let promise = new Promise(function(resolve, reject) {
        (() => {
            const tsconfig = ctx.opts.plugin.pluginInfo.dir + '/www/tsconfig.json';
            if (fs.existsSync(tsconfig) == true) {
                // The path should be quoted if there is space in path.
                var cmdStr = 'tsc --build "' + tsconfig + '"';
                exec(cmdStr, function(err, stdout, stderr){
                    if(err) {
                        reject(new Error('tsc error:' + err + ' ' + stderr));
                    } else {
                        resolve();
                    }
                    return;
                });
            }
            else {
                reject(new Error('Can not find ' + tsconfig));
            }
        })();
      });

      return promise;
};
