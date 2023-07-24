export default class Util {

    public static calculatePPColor(pp: number): string {
        return `hsv(${Math.max(0, pp - 1000) / 18000}, 1, 1)`
    }
    
}