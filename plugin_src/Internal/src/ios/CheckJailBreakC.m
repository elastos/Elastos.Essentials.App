
#import "CheckJailBreakC.h"

@implementation CheckJailBreak

+(bool)isSimulator {
#if TARGET_IPHONE_SIMULATOR
    return true;
#else
    return false;
#endif
}

//+(bool)checkCydia {
//
//    struct stat stat_info;
//    return 0 == stat("/Applications/Cydia.app", &stat_info);
//}

//+(bool)checkInject {
//    int ret ;
//    Dl_info dylib_info;
//    char *dylib_name = "/usr/lib/system/libsystem_kernel.dylib";
//    int (*func_stat)(const char *, struct stat *) = stat;
//    if ((ret = dladdr(func_stat, &dylib_info))) {
//        printf("lib :%s", dylib_info.dli_fname);
//        return strcmp(dylib_info.dli_fname, dylib_name) != 0;
//    }
//    return false;
//}

//+(bool)checkDylibs {
//    uint32_t count = _dyld_image_count();
//    for (uint32_t i = 0 ; i < count; ++i) {
//        if (strcmp(_dyld_get_image_name(i), "Library/MobileSubstrate/MobileSubstrate.dylib") == 0) {
//            return true;
//        }
//    }
//    return false;
//}

+(bool)checkEnv {
    char *env = getenv("DYLD_INSERT_LIBRARIES");
    return env != nil;
}

@end
