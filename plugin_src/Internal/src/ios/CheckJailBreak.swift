
import Foundation

extension CheckJailBreak {
    @objc static func isJailBreak() -> Bool {
        if (isSimulator()) {
            return false;
        }

        if (isContainJailBreakFiles()) {
            return true;
        }

        if (canWritePrivateFile()) {
            return true;
        }

        if (canOpenCydia()) {
            return true;
        }

        if (canGetApplicationList()) {
            return true;
        }

//        if (checkCydia()) {
//            return true;
//        }
//
//        if (checkInject()) {
//            return true;
//        }
//
//        if (checkDylibs()) {
//            return true;
//        }

        //Maybe the MobileSubstrate will be reaname, but it is inject dylibs by DYLD_INSERT_LIBRARIES
        if (checkEnv()) {
            return true;
        }

        return false;
    }

//    static func isSimulator() -> Bool {
//        #if TARGET_IPHONE_SIMULATOR
//            return true;
//        #else
//            return false;
//        #endif
//    }

    static func canOpen(path: String) -> Bool {
        let file = fopen(path, "r")
        guard file != nil else { return false }
        fclose(file)
        return true
    }

    static func isContainJailBreakFiles() -> Bool {
        let files = [
            "/Applications/Cydia.app",
            "/Applications/limera1n.app",
            "/Applications/greenpois0n.app",
            "/Applications/blackra1n.app",
            "/Applications/blacksn0w.app",
            "/Applications/redsn0w.app",
            "/Applications/Absinthe.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/"
        ]

        for file in files {
            if FileManager.default.fileExists(atPath: file) {
                return true
            }
            if canOpen(path: file) {
                return true;
            }
        }

        return false;
    }

    static func canWritePrivateFile() -> Bool {
        let path = "/private/" + NSUUID().uuidString
        do {
            try "anyString".write(toFile: path, atomically: true, encoding: String.Encoding.utf8)
            try FileManager.default.removeItem(atPath: path)
            return true
        }
        catch {
            return false
        }
    }

    static func canOpenCydia() -> Bool {
        if let url = URL(string: "cydia://") {
            return UIApplication.shared.canOpenURL(url)
        } else {
            return false
        }
    }

    static func canGetApplicationList() -> Bool {
        guard FileManager.default.fileExists(atPath: "/User/Applications/") else {
            return false
        }

        do {
            let appList = try FileManager.default.contentsOfDirectory(atPath: "/User/Applications/")
            return !appList.isEmpty
        }
        catch {
            print("get app list error \(error)")
            return false
        }
    }

}

