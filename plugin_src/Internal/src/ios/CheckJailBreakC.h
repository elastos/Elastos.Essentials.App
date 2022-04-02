

#import <Foundation/Foundation.h>

@interface CheckJailBreak: NSObject

+(bool)isSimulator;
//+(bool)checkCydia;
//+(bool)checkInject;
//+(bool)checkDylibs;
+(bool)checkEnv;

@end
