"use strict";

// CONFIGURE HERE
const patch_dirs = [
  {
    "hook": "before_plugin_install",
    "platform": "android",
    "plugin_id": "cordova-plugin-camera",
    "patch_dir": "patches/before_plugin_install_camera"
  },
  {
    "hook": "before_plugin_install",
    "platform": "android",
    "plugin_id": "cordova-plugin-firebase-lib",
    "patch_dir": "patches/before_plugin_install_firebase"
  },
  {
    "hook": "before_plugin_install",
    "platform": "android",
    "plugin_id": "cordova-plugin-printer",
    "patch_dir": "patches/before_plugin_install_printer"
  },
  {
    "hook": "before_plugin_install",
    "platform": "android",
    "plugin_id": "cordova-plugin-qrscanner",
    "patch_dir": "patches/before_plugin_install_qrscanner"
  },
  {
    "hook": "before_plugin_install",
    "platform": "ios",
    "plugin_id": "cordova-plugin-statusbar",
    "patch_dir": "patches/before_plugin_install_statusbar"
  },
  {
    "hook": "before_plugin_install",
    "platform": "ios",
    "plugin_id": "cordova-plugin-ionic-webview",
    "patch_dir": "patches/before_plugin_install_ionicwebview"
  },
]
// no need to configure below

module.exports = function(ctx) {
  // console.log(JSON.stringify(ctx, null, 2));

  const fs = require('fs'),
        path = require('path'),
        diff = require("diff"),
        mkdirp = require("mkdirp");

  patch_dirs.forEach((obj) => {
    if (obj.hook !== ctx.hook) {
      return;
    }
    if (ctx.opts.platforms && obj.platform &&
        !ctx.opts.platforms.some((val) => val.startsWith(obj.platform))) {
      return;
    }
    if (obj.plugin_id && ctx.opts.cordova && ctx.opts.cordova.platforms && obj.platform &&
        !ctx.opts.cordova.platforms.includes(obj.platform)) {
      return;
    }
    if (obj.plugin_id && ctx.opts.plugin && ctx.opts.plugin.id &&
        obj.plugin_id !== ctx.opts.plugin.id) {
      return;
    }
    console.log("Applying patches in " + obj.patch_dir);

    const patchDir = path.join(__dirname, obj.patch_dir);
    if (fs.existsSync(patchDir) && fs.lstatSync(patchDir).isDirectory()) {
      let files = fs.readdirSync(patchDir);
      files.forEach(function(file) {
        let patchFile = path.join(patchDir, file);
        if (fs.existsSync(patchFile) && fs.lstatSync(patchFile).isFile()
            && path.extname(patchFile) == ".patch") {
          let relativePatchFile = path.relative(ctx.opts.projectRoot, patchFile);
          console.log("-- Applying patch " + relativePatchFile);
          let patchStr = fs.readFileSync(patchFile, "utf8");

          // Remove the diff header for each chunks
          patchStr = patchStr.replace(/^diff .*\n(--- .*\n\+\+\+ .*\n@@[^@]+@@)/gm, "Index: \n$1");

          let uniDiffArray = diff.parsePatch(patchStr)
          diff.applyPatches(uniDiffArray, {
            loadFile: (uniDiff, callback) => {
              let oldFilePath = uniDiff.oldFileName.split('/').join(path.sep);
              let newFilePath = uniDiff.newFileName.split('/').join(path.sep);

              if ((uniDiff.hunks[0].oldStart == 0) && (uniDiff.hunks[0].oldLines == 0)) {
                // Create new file
                let newFileDir = path.dirname(newFilePath);
                if (!fs.existsSync(newFileDir)) {
                  mkdirp.sync(newFileDir);
                }
                callback(null, "")
                return;
              }

              if (!fs.existsSync(oldFilePath)) {
                if (fs.existsSync(newFilePath)
                    && fs.lstatSync(newFilePath).isFile()) {
                  console.log("  Backup origin file to " + oldFilePath);
                  let oldFileDir = path.dirname(oldFilePath);
                  if (!fs.existsSync(oldFileDir)) {
                    // console.log("Making directory " + oldFileDir);
                    mkdirp.sync(oldFileDir);
                  }
                  fs.copyFileSync(newFilePath, oldFilePath);
                }
                else {
                  callback("  Failed to open new file " + newFilePath);
                }
              }

              if (fs.existsSync(oldFilePath)
                  && fs.lstatSync(oldFilePath).isFile()) {
                // console.log("  Patching file from " + oldFilePath);
                let originStr = fs.readFileSync(oldFilePath, "utf8");
                callback(null, originStr);
              }
              else {
                callback("  Failed to open origin file " + oldFilePath);
              }
            },
            patched: (uniDiff, patchedStr, callback) => {
              let newFilePath = uniDiff.newFileName.split('/').join(path.sep);
              if (patchedStr) {
                console.log("  Patched file " + newFilePath);
                fs.writeFileSync(newFilePath, patchedStr);
                callback();
              }
              else {
                callback("  Failed to patch file " + newFilePath);
              }
            },
            complete: (err) => {
              if (err) {
                console.log(err);
                process.exit(1);
              }
            }
          })
        }
      });
    }
    return;
  });
}
