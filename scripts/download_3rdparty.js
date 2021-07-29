"use strict";

// CONFIGURE HERE
const files_to_download  = [
  {
    "url": "https://github.com/elastos/Elastos.Essentials.Plugins.Wallet/releases/download/spvsdk-V1.4/libspvsdk.zip",
    "filename": "libspvsdk.zip",
    "sourceDirs": [
      "libspvsdk"
    ],
    "targetDir": "../Plugins/Wallet/src/ios",
    "md5": "1662ad3deeceedf287093da32a437b52"
  }
]
// no need to configure below

const fs = require('fs'),
      path = require('path');

function DeleteDirectory(dir) {
  if (fs.existsSync(dir) == true) {
    var files = fs.readdirSync(dir);
    files.forEach(function(item){
      var item_path = path.join(dir, item);
      if (fs.statSync(item_path).isDirectory()) {
        DeleteDirectory(item_path);
      }
      else {
        fs.unlinkSync(item_path);
      }
    });
    fs.rmdirSync(dir);
  }
}

module.exports = function(ctx) {
  // console.log("download_3rdparty ", JSON.stringify(ctx, null, 2));

  // make sure ios platform is part of platform add
  if (!ctx.opts.platforms.some((val) => val.startsWith("ios"))) {
    return;
  }

  const wget = require('node-wget-promise'),
        readline = require('readline'),
        md5File = require('md5-file'),
        yauzl = require("yauzl"),
        mkdirp = require("mkdirp");

  let cachePath = path.join(path.dirname(ctx.scriptLocation), 'cache');
  mkdirp.sync(cachePath);

  let promise = new Promise(function(resolve, reject) {
    (async () => {
      let zip_file_count = 0;
      let downloaded_all_files = false;
      for (const obj of files_to_download) {
        let zipFilePath = path.join(cachePath, obj.filename)

        //
        // Check the md5 of the downloaded file
        //
        let fileMatched = fs.existsSync(zipFilePath)
                          && fs.lstatSync(zipFilePath).isFile()
                          && await md5File(zipFilePath) == obj.md5

        const max_attempt = 1;
        let attempt = 0;
        let files_need_to_update = false;
        while (!fileMatched && attempt < max_attempt) {
          attempt++;

          console.log("Starting to download file " + obj.filename);
          let unit = "bytes"
          await wget(obj.url, {
            onProgress: (status) => {
              let downloadedSizeInUnit = status.downloadedSize
              switch (unit) {
                case "bytes":
                  if (status.downloadedSize > (1 << 10)) {
                      downloadedSizeInUnit /= (1 << 10)
                      unit = "KB"
                  }
                  break;
                case "KB":
                  downloadedSizeInUnit /= (1 << 10)
                  if (status.downloadedSize > (1 << 20)) {
                      downloadedSizeInUnit /= (1 << 10)
                      unit = "MB"
                  }
                  break;
                case "MB":
                  downloadedSizeInUnit /= (1 << 20)
                  if (status.downloadedSize > (1 << 30)) {
                      downloadedSizeInUnit /= (1 << 10)
                      unit = "GB"
                  }
                  break;
                default:
                  downloadedSizeInUnit /= (1 << 30)
                  break;
              }
              readline.clearLine(process.stdout, 0);
              process.stdout.write("Downloading " + downloadedSizeInUnit.toFixed(1)
                                  + " " + unit);
              if (status.percentage) {
                process.stdout.write(" (" + (status.percentage * 100).toFixed(1) + "%)\r");
              }
              else {
                process.stdout.write("\r");
              }
            },
            output: zipFilePath
          });
          readline.clearLine(process.stdout, 0);
          console.log("Download finished.");

          if (fs.existsSync(zipFilePath) && fs.lstatSync(zipFilePath).isFile()) {
            let downloadFilemd5 = await md5File(zipFilePath)
            fileMatched = downloadFilemd5 == obj.md5;
            if (!fileMatched) {
              console.error("The md5 is " + downloadFilemd5 + " but the expected md5 is " + obj.md5);
            }
          }
          else {
            fileMatched = false;
          }

          files_need_to_update = true;
        }

        if (!fileMatched) {
          reject(new Error('Failed to download ' + obj.filename));
          return;
        }

        // Zip file matched md5
        console.log("File %s is ready!", obj.filename);
        if (fs.existsSync(ctx.opts.projectRoot) && fs.lstatSync(ctx.opts.projectRoot).isDirectory()) {
          let targetPath = path.join(ctx.opts.projectRoot, obj.targetDir);
          mkdirp.sync(targetPath);
          if (files_need_to_update) {// delete the old files
            for (const srcDir of obj.sourceDirs) {
              let baseName = path.basename(srcDir);
              let frameworkDir = path.join(targetPath, baseName);
              console.log("    DeleteDirectory:", frameworkDir);
              DeleteDirectory(frameworkDir);
            }
          }
          if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isDirectory()) {
            console.log("Unziping file %s", obj.filename);
            yauzl.open(zipFilePath, {lazyEntries: true}, function(err, zipfile) {
              if (err) reject(new Error(err));
              zip_file_count++;
              zipfile.readEntry();
              zipfile.on("entry", async (entry) => {
                if (/\/$/.test(entry.fileName)) {
                  // Directory file names end with '/'.
                  // Note that entires for directories themselves are optional.
                  // An entry's fileName implicitly requires its parent directories to exist.
                  zipfile.readEntry();
                } else {
                  // file entry
                  let openedReadStream = false;
                  for (const srcDir of obj.sourceDirs) {
                    let relativePath = path.relative(srcDir, entry.fileName);
                    if (!relativePath.startsWith("..")) {
                      let baseName = path.basename(srcDir);
                      relativePath = path.join(baseName, relativePath);
                      let relativeDir = path.dirname(relativePath);
                      let outputDir = path.join(targetPath, relativeDir);
                      let outputPath = path.join(targetPath, relativePath);
                      mkdirp.sync(outputDir);
                      openedReadStream = true;
                      await zipfile.openReadStream(entry, function(err, readStream) {
                        if (err) reject(new Error(err));
                        readStream.on("end", function() {
                          zipfile.readEntry();
                        });
                        let writeStream = fs.createWriteStream(outputPath);
                        readStream.pipe(writeStream);
                      });
                    }
                  }

                  if (!openedReadStream) {
                    zipfile.readEntry();
                  }
                }
              });
              zipfile.on("end", () => {
                zip_file_count--;
                if (zip_file_count == 0 && downloaded_all_files) {
                  console.log("Finished downloading and unzipping 3rdparties.");
                  resolve();
                  return;
                }
              });
            });
          }
          else {
            reject(new Error("targetDir not exist"));
            return;
          }
        }
      }
      downloaded_all_files = true;
      if (zip_file_count == 0) {
        resolve();
        return;
      }
    })();
  });

  return promise;
};
