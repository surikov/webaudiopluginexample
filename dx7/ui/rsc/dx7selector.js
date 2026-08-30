"use strict";
class DX7Loader {
    scale99(nn) {
        let speed = Math.pow(2, nn * 0.16);
        return speed;
    }
    durationDown(nn) {
        return 169 * Math.pow(2, (99 - nn) * 0.16) / Math.pow(2, 99 * 0.16);
    }
    durationUp(nn) {
        return 24.9 * Math.pow(2, (99 - nn) * 0.16) / Math.pow(2, 99 * 0.16);
    }
    levelRatio(nn) {
        return nn / 99;
    }
    slopeDuration(r99, from99, to99) {
        let partDuration = Math.abs(this.levelRatio(from99) - this.levelRatio(to99)) / this.levelRatio(99);
        let fullDuration = this.durationDown(r99);
        if (from99 < to99) {
            fullDuration = this.durationUp(r99);
        }
        let slope = {
            duration: partDuration * fullDuration,
            from: this.scale99(from99) / this.scale99(99),
            to: this.scale99(to99) / this.scale99(99)
        };
        return slope;
    }
    convertDX7data(dx7preset) {
        let modlev = 2.8;
        let preset = {
            label: dx7preset.name,
            mixID: dx7preset.algorithm1_32,
            operators: [],
            feedbackRatio: 0.075 * modlev * Math.pow(2, (dx7preset.feedback0_7 - 7)),
            modulationRatio: modlev,
            transpose: 0
        };
        for (let ii = 0; ii < 6; ii++) {
            let data = dx7preset.operators[ii];
            let attackSlope = this.slopeDuration(data.rates0_99[0], data.levels0_99[3], data.levels0_99[0]);
            let decaySlope = this.slopeDuration(data.rates0_99[1], data.levels0_99[0], data.levels0_99[1]);
            let sustainSlope = this.slopeDuration(data.rates0_99[2], data.levels0_99[1], data.levels0_99[2]);
            let releaseSlope = this.slopeDuration(data.rates0_99[3], data.levels0_99[2], data.levels0_99[3]);
            let operator = {
                constantFrequency: 0,
                frequencyRatio: 0,
                enabled: data.enabled,
                volume: 0,
                detune: data.detune_7_7,
                envelope: {
                    attack: {
                        values: [0,
                            0.025 * attackSlope.to,
                            0.05 * attackSlope.to,
                            0.2 * attackSlope.to,
                            0.35 * attackSlope.to,
                            attackSlope.to],
                        duration: attackSlope.duration
                    },
                    decay: {
                        values: [attackSlope.to,
                            attackSlope.to - 0.65 * (attackSlope.to - decaySlope.to),
                            attackSlope.to - 0.8 * (attackSlope.to - decaySlope.to),
                            attackSlope.to - 0.95 * (attackSlope.to - decaySlope.to),
                            attackSlope.to - 0.975 * (attackSlope.to - decaySlope.to),
                            decaySlope.to],
                        duration: decaySlope.duration
                    },
                    sustain: {
                        values: [decaySlope.to,
                            decaySlope.to - 0.65 * (decaySlope.to - sustainSlope.to),
                            decaySlope.to - 0.8 * (decaySlope.to - sustainSlope.to),
                            decaySlope.to - 0.95 * (decaySlope.to - sustainSlope.to),
                            decaySlope.to - 0.975 * (decaySlope.to - sustainSlope.to),
                            sustainSlope.to],
                        duration: sustainSlope.duration
                    },
                    release: releaseSlope.duration
                }
            };
            operator.envelope.attack.duration = Math.max(0.0001, operator.envelope.attack.duration);
            operator.envelope.decay.duration = Math.max(0.0001, operator.envelope.decay.duration);
            operator.envelope.sustain.duration = Math.max(0.0001, operator.envelope.sustain.duration);
            operator.envelope.release = Math.max(0.005, operator.envelope.release);
            operator.envelope.release = Math.min(3, operator.envelope.release);
            let freqRatio = 1 / (1 + dx7preset.lfoPitchModDepth0_99 / 99);
            if (data.constMode0_1 > 0) {
                operator.volume = 0.51 * Math.pow(2, data.volumeLevel0_99 * 0.125) / Math.pow(2, 99 * 0.125) * (1 - 0.2 * data.velocitySens0_7 / 7);
                operator.constantFrequency = freqRatio * Math.pow(10, data.freqCoarse0_31 % 4) * (1 + (data.freqFine0_99 / 99) * 8.772);
            }
            else {
                operator.volume = Math.pow(2, data.volumeLevel0_99 * 0.125) / Math.pow(2, 99 * 0.125) * (1 - 0.2 * data.velocitySens0_7 / 7);
                let coarse = 0.5;
                if (data.freqCoarse0_31) {
                    coarse = data.freqCoarse0_31;
                }
                operator.frequencyRatio = freqRatio * coarse * (1 + data.freqFine0_99 / 100);
            }
            operator.volume = operator.volume * (1 + dx7preset.lfoAmpModDepth0_99 / 99);
            preset.operators.push(operator);
        }
        return preset;
    }
    loadSyxFile(from, onDone) {
        let reader = new FileReader();
        let all = [];
        reader.onload = () => {
            let result = reader.result;
            for (let ii = 0; ii < 32; ii++) {
                let one = this.parseSysexData(result, ii, from.name);
                all.push(one);
            }
            onDone(all);
        };
        reader.onerror = (error) => {
            console.log('error', error);
        };
        reader.readAsText(from);
    }
    loadTxtFile(from, onDone) {
        let reader = new FileReader();
        reader.onload = () => {
            let result = reader.result;
            let one = JSON.parse(result);
            onDone(one);
        };
        reader.onerror = (error) => {
            console.log('error', error);
        };
        reader.readAsText(from);
    }
    loadJSONFile(from, onDone) {
        let reader = new FileReader();
        reader.onload = () => {
            let result = reader.result;
            let one = JSON.parse(result);
            onDone(one);
        };
        reader.onerror = (error) => {
            console.log('error', error);
        };
        reader.readAsText(from);
    }
    parseSyxFile(from, onDone) {
        let reader = new FileReader();
        let all = [];
        reader.onload = () => {
            let result = reader.result;
            for (let ii = 0; ii < 32; ii++) {
                let one = this.parseSysexData(result, ii, from.name);
                let preset = this.convertDX7data(one);
                all.push(preset);
            }
            onDone(all);
        };
        reader.onerror = (error) => {
            console.log('error', error);
        };
        reader.readAsText(from);
    }
    pow2x(x01, minx, maxx, yratio) {
        if (x01) {
            return yratio * Math.pow(2, x01 * (maxx - minx) + minx);
        }
        else {
            return 0;
        }
    }
    parseSysexData(bankData, patchId, filename) {
        var dataStart = 128 * patchId + 6;
        var dataEnd = dataStart + 128;
        var voiceData = bankData.substring(dataStart, dataEnd);
        var operators = [];
        for (var ii = 5; ii >= 0; --ii) {
            var oscStart = (5 - ii) * 17;
            var oscEnd = oscStart + 17;
            var oscData = voiceData.substring(oscStart, oscEnd);
            var operator = {
                rates0_99: [oscData.charCodeAt(0), oscData.charCodeAt(1), oscData.charCodeAt(2), oscData.charCodeAt(3)],
                levels0_99: [oscData.charCodeAt(4), oscData.charCodeAt(5), oscData.charCodeAt(6), oscData.charCodeAt(7)],
                detune_7_7: Math.floor(oscData.charCodeAt(12) >> 3) - 7,
                volumeLevel0_99: oscData.charCodeAt(14),
                constMode0_1: oscData.charCodeAt(15) & 1,
                freqCoarse0_31: Math.floor(oscData.charCodeAt(15) >> 1),
                freqFine0_99: oscData.charCodeAt(16),
                enabled: true,
                velocitySens0_7: oscData.charCodeAt(13) >> 2
            };
            operators.splice(0, 0, operator);
        }
        let preset = {
            algorithm1_32: voiceData.charCodeAt(110) + 1,
            feedback0_7: voiceData.charCodeAt(111) & 7,
            operators: operators,
            name: voiceData.substring(118, 128).trim() + ' / ' + filename,
            lfoPitchModDepth0_99: voiceData.charCodeAt(114),
            lfoAmpModDepth0_99: voiceData.charCodeAt(115),
        };
        return preset;
    }
}
let libForDX7list = [
    { "algorithm1_32": 22, "feedback0_7": 7, "operators": [{ "rates0_99": [72, 76, 99, 71], "levels0_99": [99, 88, 96, 0], "detune_7_7": 7, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [62, 51, 29, 71], "levels0_99": [82, 95, 96, 0], "detune_7_7": 7, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [77, 76, 82, 71], "levels0_99": [99, 98, 98, 0], "detune_7_7": -2, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [77, 36, 41, 71], "levels0_99": [99, 98, 98, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [77, 36, 41, 71], "levels0_99": [99, 98, 98, 0], "detune_7_7": 1, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [49, 99, 28, 68], "levels0_99": [98, 98, 91, 0], "detune_7_7": 0, "volumeLevel0_99": 82, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "BRASS 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 5, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 2, "feedback0_7": 7, "operators": [{ "rates0_99": [45, 24, 20, 41], "levels0_99": [99, 85, 70, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [75, 71, 17, 49], "levels0_99": [82, 92, 62, 0], "detune_7_7": 0, "volumeLevel0_99": 83, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [44, 45, 20, 54], "levels0_99": [99, 85, 82, 0], "detune_7_7": 0, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [96, 19, 20, 54], "levels0_99": [99, 92, 86, 0], "detune_7_7": 0, "volumeLevel0_99": 77, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [53, 19, 20, 54], "levels0_99": [86, 92, 86, 0], "detune_7_7": 0, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [53, 19, 20, 54], "levels0_99": [99, 92, 86, 0], "detune_7_7": 0, "volumeLevel0_99": 53, "constMode0_1": 0, "freqCoarse0_31": 14, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "STRINGS 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 8, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 2, "feedback0_7": 7, "operators": [{ "rates0_99": [48, 56, 10, 47], "levels0_99": [98, 98, 36, 0], "detune_7_7": 0, "volumeLevel0_99": 92, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [81, 13, 7, 25], "levels0_99": [99, 92, 28, 0], "detune_7_7": -6, "volumeLevel0_99": 74, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [51, 15, 10, 47], "levels0_99": [99, 92, 0, 0], "detune_7_7": 6, "volumeLevel0_99": 92, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [49, 74, 10, 32], "levels0_99": [98, 98, 36, 0], "detune_7_7": 0, "volumeLevel0_99": 76, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [76, 73, 10, 28], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 66, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [72, 76, 10, 32], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 70, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "STRINGS 2 / ROM1A.SYX", "lfoPitchModDepth0_99": 8, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 15, "feedback0_7": 7, "operators": [{ "rates0_99": [52, 30, 25, 43], "levels0_99": [99, 92, 90, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 71, 35, 51], "levels0_99": [82, 92, 87, 0], "detune_7_7": 0, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [50, 52, 35, 41], "levels0_99": [99, 92, 91, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [96, 19, 20, 54], "levels0_99": [99, 92, 89, 0], "detune_7_7": 0, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [53, 67, 38, 54], "levels0_99": [86, 92, 74, 0], "detune_7_7": 0, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [53, 64, 44, 54], "levels0_99": [99, 92, 56, 0], "detune_7_7": 0, "volumeLevel0_99": 54, "constMode0_1": 0, "freqCoarse0_31": 14, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "STRINGS 3 / ROM1A.SYX", "lfoPitchModDepth0_99": 30, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 5, "feedback0_7": 6, "operators": [{ "rates0_99": [96, 25, 25, 67], "levels0_99": [99, 75, 0, 0], "detune_7_7": 3, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 50, 35, 78], "levels0_99": [99, 75, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 58, "constMode0_1": 0, "freqCoarse0_31": 14, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [95, 20, 20, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 29, 20, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 89, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [95, 20, 20, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 29, 20, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }], "name": "E.PIANO 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 8, "feedback0_7": 7, "operators": [{ "rates0_99": [74, 85, 27, 70], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [91, 25, 39, 60], "levels0_99": [99, 86, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 93, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [78, 87, 22, 75], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [81, 87, 22, 75], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 89, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [81, 87, 22, 75], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 57, 99, 75], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 57, "constMode0_1": 0, "freqCoarse0_31": 12, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }], "name": "GUITAR 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 1, "lfoAmpModDepth0_99": 3 },
    { "algorithm1_32": 16, "feedback0_7": 7, "operators": [{ "rates0_99": [95, 62, 17, 58], "levels0_99": [99, 95, 32, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 20, 0, 0], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 80, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [88, 96, 32, 30], "levels0_99": [79, 65, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [90, 42, 7, 55], "levels0_99": [90, 30, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 93, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [99, 0, 0, 0], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 62, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [94, 56, 24, 55], "levels0_99": [93, 28, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 9, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }], "name": "BASS 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 32, "feedback0_7": 0, "operators": [{ "rates0_99": [99, 80, 22, 90], "levels0_99": [99, 99, 99, 0], "detune_7_7": -2, "volumeLevel0_99": 94, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 20, 22, 90], "levels0_99": [99, 99, 97, 0], "detune_7_7": -6, "volumeLevel0_99": 94, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 80, 54, 82], "levels0_99": [99, 99, 99, 0], "detune_7_7": 4, "volumeLevel0_99": 94, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 80, 22, 90], "levels0_99": [99, 99, 99, 0], "detune_7_7": 5, "volumeLevel0_99": 94, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 80, 22, 90], "levels0_99": [99, 99, 99, 0], "detune_7_7": 2, "volumeLevel0_99": 94, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 54, 22, 90], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 94, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "E.ORGAN 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 19, "feedback0_7": 7, "operators": [{ "rates0_99": [45, 25, 25, 36], "levels0_99": [99, 99, 98, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 97, 62, 47], "levels0_99": [99, 99, 90, 0], "detune_7_7": 0, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 97, 62, 47], "levels0_99": [99, 99, 90, 0], "detune_7_7": 0, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [61, 25, 25, 50], "levels0_99": [99, 99, 97, 0], "detune_7_7": 0, "volumeLevel0_99": 88, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [61, 25, 25, 61], "levels0_99": [99, 99, 93, 0], "detune_7_7": 0, "volumeLevel0_99": 97, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [72, 25, 25, 70], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 76, "constMode0_1": 0, "freqCoarse0_31": 10, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "PIPES 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 5, "feedback0_7": 1, "operators": [{ "rates0_99": [95, 28, 27, 47], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 89, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 72, 71, 99], "levels0_99": [99, 97, 91, 98], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 28, 27, 47], "levels0_99": [99, 90, 0, 0], "detune_7_7": -1, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 72, 71, 99], "levels0_99": [99, 97, 91, 98], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 28, 27, 47], "levels0_99": [99, 90, 0, 0], "detune_7_7": -1, "volumeLevel0_99": 83, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [95, 72, 71, 99], "levels0_99": [99, 97, 91, 98], "detune_7_7": 0, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 6, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "HARPSICH 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 3, "feedback0_7": 5, "operators": [{ "rates0_99": [95, 92, 28, 60], "levels0_99": [99, 90, 0, 0], "detune_7_7": 1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [95, 95, 0, 0], "levels0_99": [99, 96, 89, 0], "detune_7_7": -1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [98, 87, 0, 0], "levels0_99": [87, 86, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 71, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [95, 92, 28, 60], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 95, 0, 0], "levels0_99": [99, 96, 89, 0], "detune_7_7": -2, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [98, 87, 0, 0], "levels0_99": [87, 86, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 78, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }], "name": "CLAV 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 23, "feedback0_7": 5, "operators": [{ "rates0_99": [99, 28, 99, 50], "levels0_99": [99, 25, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 50, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [80, 85, 24, 50], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [80, 85, 43, 50], "levels0_99": [99, 74, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 72, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [80, 85, 24, 50], "levels0_99": [99, 90, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [80, 85, 24, 50], "levels0_99": [99, 90, 42, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [99, 48, 99, 50], "levels0_99": [99, 32, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 57, "constMode0_1": 0, "freqCoarse0_31": 14, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }], "name": "VIBE 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 7, "feedback0_7": 0, "operators": [{ "rates0_99": [95, 40, 49, 55], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 95, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 72, 0, 0], "levels0_99": [82, 48, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 33, 49, 41], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 75, 0, 82], "levels0_99": [82, 48, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 75, 0, 8], "levels0_99": [82, 48, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 93, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [0, 63, 55, 0], "levels0_99": [78, 78, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 13, "enabled": true, "velocitySens0_7": 2 }], "name": "MARIMBA / ROM1A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 2, "feedback0_7": 7, "operators": [{ "rates0_99": [94, 62, 58, 34], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 68, 28, 48], "levels0_99": [99, 83, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 64, 30, 33], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [90, 28, 17, 39], "levels0_99": [99, 76, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 82, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [91, 37, 29, 29], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 83, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [82, 53, 37, 48], "levels0_99": [99, 81, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 81, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }], "name": "KOTO / ROM1A.SYX", "lfoPitchModDepth0_99": 17, "lfoAmpModDepth0_99": 15 },
    { "algorithm1_32": 16, "feedback0_7": 5, "operators": [{ "rates0_99": [61, 67, 70, 65], "levels0_99": [93, 89, 98, 0], "detune_7_7": -2, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 97, 62, 54], "levels0_99": [99, 99, 90, 0], "detune_7_7": 4, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [53, 38, 75, 61], "levels0_99": [88, 44, 24, 0], "detune_7_7": -3, "volumeLevel0_99": 76, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [61, 25, 25, 60], "levels0_99": [99, 99, 97, 0], "detune_7_7": 0, "volumeLevel0_99": 0, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [65, 38, 0, 61], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 56, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 64, 98, 61], "levels0_99": [99, 67, 52, 0], "detune_7_7": 4, "volumeLevel0_99": 83, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 53, "enabled": true, "velocitySens0_7": 2 }], "name": "FLUTE 1 / ROM1A.SYX", "lfoPitchModDepth0_99": 8, "lfoAmpModDepth0_99": 13 },
    { "algorithm1_32": 5, "feedback0_7": 7, "operators": [{ "rates0_99": [34, 42, 71, 34], "levels0_99": [99, 99, 99, 0], "detune_7_7": 5, "volumeLevel0_99": 97, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 0, 0, 0], "levels0_99": [99, 99, 99, 0], "detune_7_7": 5, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [80, 49, 17, 30], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [80, 70, 9, 12], "levels0_99": [88, 80, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 91, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 57, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [41, 42, 71, 34], "levels0_99": [99, 99, 99, 0], "detune_7_7": 7, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 0, 0, 0], "levels0_99": [99, 99, 99, 0], "detune_7_7": -7, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "ORCH-CHIME / ROM1A.SYX", "lfoPitchModDepth0_99": 5, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 5, "feedback0_7": 7, "operators": [{ "rates0_99": [95, 33, 71, 25], "levels0_99": [99, 0, 32, 0], "detune_7_7": 2, "volumeLevel0_99": 95, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [98, 12, 71, 28], "levels0_99": [99, 0, 32, 0], "detune_7_7": 3, "volumeLevel0_99": 78, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 75, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 33, 71, 25], "levels0_99": [99, 0, 32, 0], "detune_7_7": -5, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [98, 12, 71, 28], "levels0_99": [99, 0, 32, 0], "detune_7_7": -2, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 75, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [76, 78, 71, 70], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 1, "freqCoarse0_31": 2, "freqFine0_99": 51, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [98, 91, 0, 28], "levels0_99": [99, 0, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "TUB BELLS / ROM1A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 15, "feedback0_7": 5, "operators": [{ "rates0_99": [99, 40, 33, 38], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 19, 20, 9], "levels0_99": [99, 87, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 64, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 70, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 30, 35, 42], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 44, 50, 21], "levels0_99": [91, 82, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 88, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 40, 38, 0], "levels0_99": [91, 82, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 64, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 33, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 49, 28, 12], "levels0_99": [91, 82, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 49, "constMode0_1": 1, "freqCoarse0_31": 2, "freqFine0_99": 60, "enabled": true, "velocitySens0_7": 0 }], "name": "STEEL DRUM / ROM1A.SYX", "lfoPitchModDepth0_99": 10, "lfoAmpModDepth0_99": 99 },
    { "algorithm1_32": 16, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 36, 98, 33], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 74, 0, 0], "levels0_99": [99, 0, 0, 0], "detune_7_7": 3, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 77, 26, 23], "levels0_99": [99, 72, 0, 0], "detune_7_7": -3, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 36, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 31, 17, 30], "levels0_99": [99, 75, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 75, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 50, 26, 19], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [98, 2, 26, 27], "levels0_99": [98, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 56, "enabled": true, "velocitySens0_7": 1 }], "name": "TIMPANI / ROM1A.SYX", "lfoPitchModDepth0_99": 16, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 30, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 99, 36, 41], "levels0_99": [99, 99, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 71, 30, 42], "levels0_99": [99, 70, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 71, 39, 42], "levels0_99": [99, 70, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 11, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 29, 30], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 68, "constMode0_1": 0, "freqCoarse0_31": 12, "freqFine0_99": 5, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 99, 42], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 66, "constMode0_1": 0, "freqCoarse0_31": 12, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 36, 41], "levels0_99": [99, 99, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 4, "enabled": true, "velocitySens0_7": 0 }], "name": "TOY PIANO / ROM1B.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 4, "feedback0_7": 0, "operators": [{ "rates0_99": [80, 32, 18, 66], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 39, 21, 30], "levels0_99": [99, 85, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 93, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 17, 17, 66], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 77, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [95, 99, 23, 84], "levels0_99": [99, 99, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 42, 15, 99], "levels0_99": [99, 61, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 91, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [93, 5, 17, 30], "levels0_99": [76, 51, 0, 0], "detune_7_7": 3, "volumeLevel0_99": 67, "constMode0_1": 0, "freqCoarse0_31": 12, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }], "name": "CLAV 3 / ROM1B.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 29, "feedback0_7": 6, "operators": [{ "rates0_99": [99, 99, 99, 98], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 99, 98], "levels0_99": [99, 99, 99, 0], "detune_7_7": 1, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 99, 99, 98], "levels0_99": [99, 99, 99, 0], "detune_7_7": 1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 99, 98], "levels0_99": [99, 99, 99, 0], "detune_7_7": -2, "volumeLevel0_99": 81, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 31, 99, 98], "levels0_99": [99, 80, 80, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 42, 99, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 71, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }], "name": "E.ORGAN 2 / ROM1B.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 29, "feedback0_7": 0, "operators": [{ "rates0_99": [99, 99, 99, 98], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 99, 98], "levels0_99": [99, 99, 99, 0], "detune_7_7": 1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 99, 98], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 99, 99, 98], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 71, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 99, 99, 98], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 61, 99, 99], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "E.ORGAN 3 / ROM1B.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 29, "feedback0_7": 6, "operators": [{ "rates0_99": [99, 98, 10, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 91, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 98, 10, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 98, 10, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 98, 10, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 98, 10, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 89, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 98, 10, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "E.ORGAN 5 / ROM1B.SYX", "lfoPitchModDepth0_99": 22, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 25, "feedback0_7": 3, "operators": [{ "rates0_99": [77, 80, 74, 48], "levels0_99": [99, 97, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 57, 64], "levels0_99": [57, 52, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [76, 80, 22, 63], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [73, 80, 22, 50], "levels0_99": [79, 99, 99, 0], "detune_7_7": -1, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [88, 68, 22, 75], "levels0_99": [60, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 80, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [89, 80, 22, 65], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 58, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }], "name": "PIPES 3 / ROM1B.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 6, "feedback0_7": 0, "operators": [{ "rates0_99": [60, 25, 25, 71], "levels0_99": [99, 99, 98, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 97, 62, 54], "levels0_99": [99, 99, 90, 0], "detune_7_7": 0, "volumeLevel0_99": 88, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [57, 97, 62, 54], "levels0_99": [99, 99, 90, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 25, 50], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 77, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [66, 99, 99, 51], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 99, 45], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "PIPES 4 / ROM1B.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 3, "feedback0_7": 7, "operators": [{ "rates0_99": [94, 44, 35, 34], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 92, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 39, 33, 16], "levels0_99": [99, 83, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 89, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 28, 30, 33], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [94, 44, 35, 34], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [91, 37, 29, 29], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 91, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [82, 53, 37, 48], "levels0_99": [99, 81, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 81, "constMode0_1": 0, "freqCoarse0_31": 6, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }], "name": "GUITAR 6 / ROM1B.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 16 },
    { "algorithm1_32": 3, "feedback0_7": 6, "operators": [{ "rates0_99": [95, 32, 45, 31], "levels0_99": [99, 70, 0, 0], "detune_7_7": 5, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [95, 46, 99, 12], "levels0_99": [99, 70, 0, 0], "detune_7_7": -2, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [95, 50, 44, 10], "levels0_99": [99, 70, 0, 0], "detune_7_7": -6, "volumeLevel0_99": 62, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 32, 49, 33], "levels0_99": [99, 70, 0, 0], "detune_7_7": -4, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [95, 35, 99, 28], "levels0_99": [99, 70, 0, 0], "detune_7_7": 4, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [95, 46, 28, 24], "levels0_99": [94, 79, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }], "name": "HARP 2 / ROM1B.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 17, "feedback0_7": 5, "operators": [{ "rates0_99": [65, 0, 12, 70], "levels0_99": [99, 90, 97, 0], "detune_7_7": 1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [95, 95, 0, 0], "levels0_99": [99, 96, 89, 0], "detune_7_7": -1, "volumeLevel0_99": 68, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [98, 87, 0, 0], "levels0_99": [87, 86, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 92, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 92, 28, 60], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 59, "constMode0_1": 0, "freqCoarse0_31": 6, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [85, 70, 97, 0], "levels0_99": [99, 65, 60, 0], "detune_7_7": -2, "volumeLevel0_99": 54, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [73, 70, 60, 0], "levels0_99": [99, 99, 97, 0], "detune_7_7": 0, "volumeLevel0_99": 47, "constMode0_1": 0, "freqCoarse0_31": 10, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "CLARINET / ROM2A.SYX", "lfoPitchModDepth0_99": 7, "lfoAmpModDepth0_99": 99 },
    { "algorithm1_32": 2, "feedback0_7": 7, "operators": [{ "rates0_99": [56, 33, 40, 47], "levels0_99": [99, 87, 89, 0], "detune_7_7": 3, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [79, 68, 62, 40], "levels0_99": [99, 99, 99, 0], "detune_7_7": -2, "volumeLevel0_99": 78, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [48, 33, 40, 47], "levels0_99": [99, 87, 89, 0], "detune_7_7": 3, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [79, 68, 62, 40], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [46, 60, 40, 40], "levels0_99": [87, 87, 93, 0], "detune_7_7": 0, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 31, 98, 20], "levels0_99": [98, 1, 78, 0], "detune_7_7": -3, "volumeLevel0_99": 68, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 1 }], "name": "STRINGS 7 / ROM2A.SYX", "lfoPitchModDepth0_99": 15, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 2, "feedback0_7": 7, "operators": [{ "rates0_99": [62, 70, 20, 54], "levels0_99": [99, 97, 95, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [53, 46, 60, 53], "levels0_99": [98, 95, 95, 0], "detune_7_7": -7, "volumeLevel0_99": 82, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [62, 70, 20, 54], "levels0_99": [99, 92, 84, 0], "detune_7_7": 4, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [53, 13, 60, 53], "levels0_99": [98, 80, 85, 0], "detune_7_7": -2, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [53, 13, 60, 53], "levels0_99": [98, 80, 85, 0], "detune_7_7": 0, "volumeLevel0_99": 57, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [53, 13, 60, 53], "levels0_99": [98, 80, 85, 0], "detune_7_7": 2, "volumeLevel0_99": 92, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 0 }], "name": "BRASS 5 / ROM2A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 71 },
    { "algorithm1_32": 6, "feedback0_7": 5, "operators": [{ "rates0_99": [51, 0, 12, 70], "levels0_99": [99, 90, 97, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [67, 95, 70, 0], "levels0_99": [99, 96, 79, 0], "detune_7_7": -7, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [50, 0, 12, 70], "levels0_99": [99, 90, 97, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [62, 95, 70, 0], "levels0_99": [99, 96, 79, 0], "detune_7_7": 7, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [48, 0, 12, 70], "levels0_99": [99, 90, 97, 0], "detune_7_7": 0, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [78, 95, 70, 0], "levels0_99": [99, 96, 75, 0], "detune_7_7": 0, "volumeLevel0_99": 89, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "RECORDER / ROM2A.SYX", "lfoPitchModDepth0_99": 38, "lfoAmpModDepth0_99": 99 },
    { "algorithm1_32": 1, "feedback0_7": 7, "operators": [{ "rates0_99": [54, 56, 28, 64], "levels0_99": [92, 87, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [51, 17, 99, 61], "levels0_99": [89, 10, 43, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [54, 56, 28, 64], "levels0_99": [92, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [38, 17, 99, 61], "levels0_99": [89, 10, 43, 0], "detune_7_7": 0, "volumeLevel0_99": 72, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [65, 86, 98, 62], "levels0_99": [98, 0, 98, 0], "detune_7_7": 7, "volumeLevel0_99": 61, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 32, 98, 62], "levels0_99": [99, 67, 52, 0], "detune_7_7": 0, "volumeLevel0_99": 41, "constMode0_1": 0, "freqCoarse0_31": 6, "freqFine0_99": 27, "enabled": true, "velocitySens0_7": 7 }], "name": "HRMNCA2 BC / ROM2A.SYX", "lfoPitchModDepth0_99": 6, "lfoAmpModDepth0_99": 60 },
    { "algorithm1_32": 7, "feedback0_7": 7, "operators": [{ "rates0_99": [95, 47, 30, 47], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 46, 35, 0], "levels0_99": [80, 75, 67, 0], "detune_7_7": 0, "volumeLevel0_99": 82, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 60, 49, 38], "levels0_99": [99, 81, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 71, 0, 97], "levels0_99": [82, 48, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 97, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [99, 69, 0, 96], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 69, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [94, 56, 24, 55], "levels0_99": [96, 78, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 72, "constMode0_1": 0, "freqCoarse0_31": 16, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }], "name": "GLOKENSPL / ROM2A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 6, "feedback0_7": 7, "operators": [{ "rates0_99": [97, 20, 20, 26], "levels0_99": [99, 90, 80, 0], "detune_7_7": 0, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [97, 20, 20, 34], "levels0_99": [99, 90, 80, 0], "detune_7_7": 0, "volumeLevel0_99": 81, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [17, 99, 20, 26], "levels0_99": [0, 90, 80, 0], "detune_7_7": -3, "volumeLevel0_99": 81, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [97, 20, 20, 34], "levels0_99": [99, 90, 80, 0], "detune_7_7": 0, "volumeLevel0_99": 67, "constMode0_1": 0, "freqCoarse0_31": 6, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [26, 99, 20, 33], "levels0_99": [0, 90, 80, 0], "detune_7_7": 3, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 25, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [97, 20, 20, 34], "levels0_99": [99, 90, 80, 0], "detune_7_7": 0, "volumeLevel0_99": 66, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "CHIMES / ROM2A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 27, "feedback0_7": 5, "operators": [{ "rates0_99": [94, 28, 99, 29], "levels0_99": [99, 25, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [94, 28, 99, 29], "levels0_99": [99, 25, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 93, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 18, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 28, 99, 29], "levels0_99": [99, 25, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 81, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 5, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 28, 15, 25], "levels0_99": [99, 25, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 18, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 28, 99, 21], "levels0_99": [99, 25, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 48, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 28, 99, 23], "levels0_99": [99, 25, 0, 0], "detune_7_7": 1, "volumeLevel0_99": 74, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 5, "enabled": true, "velocitySens0_7": 0 }], "name": "BELLS / ROM2A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 6, "feedback0_7": 0, "operators": [{ "rates0_99": [96, 45, 50, 50], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [96, 80, 50, 33], "levels0_99": [78, 75, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 7, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [96, 65, 65, 50], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 1, "freqCoarse0_31": 2, "freqFine0_99": 72, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [96, 98, 44, 33], "levels0_99": [99, 96, 97, 0], "detune_7_7": 0, "volumeLevel0_99": 80, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [96, 76, 50, 46], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [96, 66, 99, 33], "levels0_99": [99, 96, 89, 0], "detune_7_7": 0, "volumeLevel0_99": 74, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "COW BELL / ROM2A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 18, "feedback0_7": 7, "operators": [{ "rates0_99": [96, 34, 44, 66], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 97, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [96, 93, 65, 66], "levels0_99": [60, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [96, 93, 80, 66], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 70, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [96, 83, 67, 66], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 65, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [96, 93, 49, 66], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 55, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [96, 83, 49, 66], "levels0_99": [99, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 17, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }], "name": "BLOCK / ROM2A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 7, "feedback0_7": 6, "operators": [{ "rates0_99": [99, 66, 99, 99], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [99, 89, 0, 0], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 71, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [98, 47, 38, 37], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 34, 38, 28], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 50, "constMode0_1": 0, "freqCoarse0_31": 7, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [85, 67, 96, 25], "levels0_99": [99, 0, 0, 0], "detune_7_7": 1, "volumeLevel0_99": 68, "constMode0_1": 0, "freqCoarse0_31": 20, "freqFine0_99": 2, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 79, 92, 71], "levels0_99": [99, 0, 0, 0], "detune_7_7": 1, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 15, "freqFine0_99": 8, "enabled": true, "velocitySens0_7": 0 }], "name": "FLEXATONE / ROM2A.SYX", "lfoPitchModDepth0_99": 36, "lfoAmpModDepth0_99": 90 },
    { "algorithm1_32": 14, "feedback0_7": 5, "operators": [{ "rates0_99": [88, 47, 46, 46], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 77, 42, 35], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [83, 20, 50, 41], "levels0_99": [99, 27, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [90, 58, 50, 41], "levels0_99": [96, 27, 0, 0], "detune_7_7": 3, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 2, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [74, 87, 50, 41], "levels0_99": [87, 27, 0, 0], "detune_7_7": -1, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 4, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [56, 77, 50, 41], "levels0_99": [99, 97, 68, 0], "detune_7_7": 1, "volumeLevel0_99": 10, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 2, "enabled": true, "velocitySens0_7": 0 }], "name": "LOG DRUM / ROM2A.SYX", "lfoPitchModDepth0_99": 2, "lfoAmpModDepth0_99": 80 },
    { "algorithm1_32": 15, "feedback0_7": 7, "operators": [{ "rates0_99": [32, 56, 10, 47], "levels0_99": [99, 98, 36, 0], "detune_7_7": 4, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [77, 7, 7, 29], "levels0_99": [93, 56, 28, 0], "detune_7_7": -7, "volumeLevel0_99": 81, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [51, 15, 10, 47], "levels0_99": [99, 92, 92, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [49, 74, 10, 32], "levels0_99": [98, 98, 98, 0], "detune_7_7": 2, "volumeLevel0_99": 72, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [76, 73, 10, 28], "levels0_99": [99, 92, 0, 0], "detune_7_7": -2, "volumeLevel0_99": 71, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [72, 76, 10, 32], "levels0_99": [99, 92, 0, 0], "detune_7_7": 5, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "STRG ENS 1 / ROM3A.SYX", "lfoPitchModDepth0_99": 15, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 7, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 33, 50, 46], "levels0_99": [99, 80, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 33, 46, 50], "levels0_99": [99, 80, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 60, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [99, 31, 50, 46], "levels0_99": [99, 80, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [90, 75, 0, 82], "levels0_99": [82, 48, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 91, "constMode0_1": 0, "freqCoarse0_31": 7, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [99, 64, 0, 8], "levels0_99": [82, 48, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 97, "constMode0_1": 0, "freqCoarse0_31": 7, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 77, 55, 0], "levels0_99": [78, 78, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 7, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }], "name": "MARIMBA / ROM3A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 8, "feedback0_7": 5, "operators": [{ "rates0_99": [98, 72, 75, 61], "levels0_99": [99, 99, 99, 0], "detune_7_7": 1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [74, 28, 29, 61], "levels0_99": [99, 71, 71, 0], "detune_7_7": 4, "volumeLevel0_99": 92, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [98, 72, 75, 61], "levels0_99": [99, 89, 99, 0], "detune_7_7": -1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [85, 28, 75, 61], "levels0_99": [88, 44, 25, 0], "detune_7_7": 4, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [85, 38, 75, 61], "levels0_99": [88, 44, 25, 0], "detune_7_7": 0, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [85, 16, 75, 61], "levels0_99": [88, 44, 25, 0], "detune_7_7": -3, "volumeLevel0_99": 80, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }], "name": "PRC SYNTH1 / ROM3A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 14, "feedback0_7": 7, "operators": [{ "rates0_99": [83, 35, 0, 39], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 60, 26, 71], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 80, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [83, 34, 0, 46], "levels0_99": [99, 0, 0, 0], "detune_7_7": 5, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [99, 34, 26, 39], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 82, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [99, 56, 26, 42], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 83, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [96, 89, 26, 46], "levels0_99": [99, 0, 0, 0], "detune_7_7": 1, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 6, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }], "name": "HARP 1 / ROM3A.SYX", "lfoPitchModDepth0_99": 1, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 16, "feedback0_7": 7, "operators": [{ "rates0_99": [91, 36, 98, 33], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 76, 26, 23], "levels0_99": [99, 72, 127, 0], "detune_7_7": 3, "volumeLevel0_99": 80, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 77, 26, 23], "levels0_99": [99, 72, 0, 0], "detune_7_7": -3, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 36, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [65, 31, 17, 30], "levels0_99": [99, 75, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 75, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [99, 50, 26, 19], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [98, 2, 26, 27], "levels0_99": [98, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 56, "enabled": true, "velocitySens0_7": 1 }], "name": "TIMPANI / ROM3A.SYX", "lfoPitchModDepth0_99": 16, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 31, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 38, 40, 15], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 55, 75, 18], "levels0_99": [99, 32, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 19, "freqFine0_99": 2, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 82, 98, 17], "levels0_99": [99, 0, 98, 0], "detune_7_7": 0, "volumeLevel0_99": 65, "constMode0_1": 0, "freqCoarse0_31": 17, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 82, 98, 15], "levels0_99": [99, 0, 98, 0], "detune_7_7": 0, "volumeLevel0_99": 61, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 11, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 82, 98, 15], "levels0_99": [99, 0, 98, 0], "detune_7_7": 0, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [25, 21, 98, 15], "levels0_99": [99, 0, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }], "name": "LASERSWEEP / ROM3A.SYX", "lfoPitchModDepth0_99": 98, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 5, "feedback0_7": 4, "operators": [{ "rates0_99": [95, 33, 71, 25], "levels0_99": [99, 0, 32, 0], "detune_7_7": 2, "volumeLevel0_99": 95, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [98, 12, 71, 28], "levels0_99": [99, 0, 32, 0], "detune_7_7": 3, "volumeLevel0_99": 78, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 75, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 33, 71, 25], "levels0_99": [99, 0, 32, 0], "detune_7_7": -5, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [98, 12, 71, 28], "levels0_99": [99, 0, 32, 0], "detune_7_7": -2, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 75, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [69, 11, 71, 28], "levels0_99": [99, 0, 32, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [19, 12, 71, 28], "levels0_99": [99, 0, 32, 0], "detune_7_7": 0, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "TUB ERUPT / ROM3A.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 15, "feedback0_7": 7, "operators": [{ "rates0_99": [56, 33, 40, 47], "levels0_99": [99, 87, 89, 0], "detune_7_7": 3, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [79, 68, 62, 40], "levels0_99": [99, 99, 99, 0], "detune_7_7": -2, "volumeLevel0_99": 78, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 51, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [56, 33, 40, 47], "levels0_99": [99, 87, 89, 0], "detune_7_7": 4, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [79, 68, 62, 40], "levels0_99": [99, 99, 99, 0], "detune_7_7": -4, "volumeLevel0_99": 72, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [46, 60, 40, 40], "levels0_99": [87, 87, 93, 0], "detune_7_7": 6, "volumeLevel0_99": 83, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 31, 98, 20], "levels0_99": [98, 1, 78, 0], "detune_7_7": -4, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }], "name": "STGS 5THS / ROM4A.SYX", "lfoPitchModDepth0_99": 6, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 2, "feedback0_7": 7, "operators": [{ "rates0_99": [96, 34, 39, 40], "levels0_99": [99, 97, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 16, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [92, 87, 61, 44], "levels0_99": [99, 79, 56, 56], "detune_7_7": 0, "volumeLevel0_99": 95, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 72, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [94, 35, 39, 40], "levels0_99": [99, 97, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 16, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [95, 95, 29, 28], "levels0_99": [99, 71, 38, 38], "detune_7_7": 0, "volumeLevel0_99": 89, "constMode0_1": 1, "freqCoarse0_31": 1, "freqFine0_99": 68, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 74, 46, 44], "levels0_99": [99, 96, 63, 63], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 1, "freqCoarse0_31": 1, "freqFine0_99": 73, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [94, 64, 20, 20], "levels0_99": [99, 88, 74, 74], "detune_7_7": 0, "volumeLevel0_99": 77, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }], "name": "Toms C3-C4 / 2GreyMatter.syx", "lfoPitchModDepth0_99": 78, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 15, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 40, 33, 35], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 19, 20, 44], "levels0_99": [99, 87, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 67, "constMode0_1": 1, "freqCoarse0_31": 31, "freqFine0_99": 66, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 30, 35, 43], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 26, 50, 21], "levels0_99": [91, 82, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 1, "freqCoarse0_31": 23, "freqFine0_99": 55, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 40, 38, 20], "levels0_99": [91, 82, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 64, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 60, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [0, 49, 28, 12], "levels0_99": [91, 82, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 49, "constMode0_1": 1, "freqCoarse0_31": 2, "freqFine0_99": 60, "enabled": true, "velocitySens0_7": 0 }], "name": "Agogo / 2GreyMatter.syx", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 20, "feedback0_7": 7, "operators": [{ "rates0_99": [83, 40, 28, 43], "levels0_99": [99, 92, 0, 0], "detune_7_7": 2, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [94, 40, 31, 44], "levels0_99": [99, 89, 0, 0], "detune_7_7": -6, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [89, 53, 22, 39], "levels0_99": [99, 62, 0, 0], "detune_7_7": 4, "volumeLevel0_99": 59, "constMode0_1": 0, "freqCoarse0_31": 13, "freqFine0_99": 8, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [90, 52, 31, 59], "levels0_99": [99, 60, 0, 0], "detune_7_7": 6, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [82, 87, 81, 55], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 67, "constMode0_1": 0, "freqCoarse0_31": 16, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [84, 63, 44, 99], "levels0_99": [99, 53, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 76, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 42, "enabled": true, "velocitySens0_7": 2 }], "name": "Cool Vibes / 2GreyMatter.syx", "lfoPitchModDepth0_99": 5, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 22, "feedback0_7": 7, "operators": [{ "rates0_99": [78, 25, 21, 60], "levels0_99": [99, 88, 96, 0], "detune_7_7": -3, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 42, 23, 71], "levels0_99": [99, 56, 56, 0], "detune_7_7": 0, "volumeLevel0_99": 88, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 76, 99, 54], "levels0_99": [99, 97, 96, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 76, 99, 54], "levels0_99": [99, 97, 96, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 76, 99, 54], "levels0_99": [99, 97, 96, 0], "detune_7_7": 0, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [4, 50, 27, 60], "levels0_99": [99, 95, 83, 0], "detune_7_7": 7, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "LEADSYN 2 / ANALOG1.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 5, "feedback0_7": 6, "operators": [{ "rates0_99": [96, 25, 25, 67], "levels0_99": [99, 75, 0, 0], "detune_7_7": 3, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 50, 35, 78], "levels0_99": [99, 75, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 78, "constMode0_1": 0, "freqCoarse0_31": 19, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [95, 20, 20, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": -1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 29, 20, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [95, 20, 20, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 29, 20, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }], "name": "DYNORHODE2 / ANGELO.SYX", "lfoPitchModDepth0_99": 7, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 15, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 50, 25, 49], "levels0_99": [99, 92, 95, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 1, "freqCoarse0_31": 12, "freqFine0_99": 26, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 53, 31, 0], "levels0_99": [82, 95, 91, 0], "detune_7_7": -7, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 36, 35, 49], "levels0_99": [80, 96, 95, 0], "detune_7_7": 2, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 37, 27, 26], "levels0_99": [72, 97, 94, 0], "detune_7_7": -5, "volumeLevel0_99": 74, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 67, 38, 0], "levels0_99": [86, 92, 92, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 57, 37, 0], "levels0_99": [73, 92, 88, 0], "detune_7_7": 7, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 24, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "AERIELBOND / ANGELO.SYX", "lfoPitchModDepth0_99": 8, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 10, "feedback0_7": 6, "operators": [{ "rates0_99": [80, 32, 18, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": -6, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 39, 21, 26], "levels0_99": [99, 85, 0, 99], "detune_7_7": -6, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [95, 17, 17, 45], "levels0_99": [99, 95, 0, 99], "detune_7_7": 5, "volumeLevel0_99": 71, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [95, 47, 21, 53], "levels0_99": [99, 97, 0, 0], "detune_7_7": 5, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 33, 18, 56], "levels0_99": [99, 95, 0, 82], "detune_7_7": 4, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [95, 49, 17, 54], "levels0_99": [99, 95, 0, 99], "detune_7_7": 7, "volumeLevel0_99": 65, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }], "name": "MEDL XPRSV / ANGELO.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 18, "feedback0_7": 7, "operators": [{ "rates0_99": [95, 62, 17, 58], "levels0_99": [99, 95, 32, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 20, 0, 0], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 88, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [88, 96, 32, 30], "levels0_99": [79, 65, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 95, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [90, 42, 7, 55], "levels0_99": [90, 30, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 81, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 0, 0, 0], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 57, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 56, 24, 55], "levels0_99": [93, 28, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "BASSdb2 / ATSU_4.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 3, "feedback0_7": 7, "operators": [{ "rates0_99": [95, 27, 45, 41], "levels0_99": [99, 70, 55, 0], "detune_7_7": 5, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 48, 99, 99], "levels0_99": [99, 70, 0, 0], "detune_7_7": -1, "volumeLevel0_99": 74, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [95, 28, 44, 57], "levels0_99": [99, 70, 4, 0], "detune_7_7": 2, "volumeLevel0_99": 39, "constMode0_1": 0, "freqCoarse0_31": 11, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [95, 27, 49, 60], "levels0_99": [99, 68, 0, 0], "detune_7_7": -4, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 37, 48, 14], "levels0_99": [99, 70, 2, 0], "detune_7_7": 4, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [95, 46, 25, 28], "levels0_99": [94, 79, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 74, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }], "name": "NYLONdb1 / ATSU_4.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 19, "feedback0_7": 0, "operators": [{ "rates0_99": [90, 30, 28, 45], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [98, 36, 6, 32], "levels0_99": [91, 90, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [94, 80, 19, 12], "levels0_99": [83, 67, 0, 0], "detune_7_7": -3, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [90, 64, 42, 45], "levels0_99": [99, 97, 0, 0], "detune_7_7": 3, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [98, 20, 15, 81], "levels0_99": [91, 61, 64, 0], "detune_7_7": -2, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [80, 73, 57, 10], "levels0_99": [99, 19, 0, 0], "detune_7_7": 2, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 9, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }], "name": "SPACE TAK / ATSU_4.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 14, "feedback0_7": 6, "operators": [{ "rates0_99": [85, 68, 6, 66], "levels0_99": [94, 99, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [73, 50, 10, 35], "levels0_99": [94, 99, 46, 0], "detune_7_7": -6, "volumeLevel0_99": 95, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 61, 10, 66], "levels0_99": [99, 94, 0, 0], "detune_7_7": 6, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 10, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 40, 17, 21], "levels0_99": [94, 93, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 71, "constMode0_1": 1, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 45, 35, 99], "levels0_99": [99, 69, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 75, "constMode0_1": 1, "freqCoarse0_31": 31, "freqFine0_99": 99, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [99, 60, 14, 99], "levels0_99": [99, 97, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 77, "constMode0_1": 1, "freqCoarse0_31": 31, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }], "name": "RQK GUITAR / ATSU_5.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 3, "feedback0_7": 5, "operators": [{ "rates0_99": [90, 41, 28, 55], "levels0_99": [99, 95, 0, 0], "detune_7_7": -4, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [98, 36, 6, 32], "levels0_99": [91, 90, 0, 0], "detune_7_7": 4, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [94, 80, 19, 12], "levels0_99": [84, 67, 0, 0], "detune_7_7": -3, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 10, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [90, 64, 28, 55], "levels0_99": [99, 97, 0, 0], "detune_7_7": 4, "volumeLevel0_99": 95, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [98, 20, 6, 2], "levels0_99": [91, 89, 0, 0], "detune_7_7": -3, "volumeLevel0_99": 89, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [94, 15, 21, 35], "levels0_99": [99, 19, 0, 0], "detune_7_7": 3, "volumeLevel0_99": 77, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }], "name": "CASIQPEA P / ATSU_5.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 5, "feedback0_7": 6, "operators": [{ "rates0_99": [66, 33, 0, 47], "levels0_99": [99, 99, 85, 0], "detune_7_7": 2, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [64, 38, 6, 0], "levels0_99": [99, 92, 99, 0], "detune_7_7": -1, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [83, 15, 10, 47], "levels0_99": [99, 92, 0, 0], "detune_7_7": 3, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 74, 10, 0], "levels0_99": [98, 98, 36, 0], "detune_7_7": 3, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [77, 54, 0, 47], "levels0_99": [98, 98, 36, 0], "detune_7_7": -4, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [73, 75, 5, 0], "levels0_99": [99, 99, 92, 0], "detune_7_7": 5, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "SYNTH ENS2 / B1.SYX", "lfoPitchModDepth0_99": 11, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 5, "feedback0_7": 0, "operators": [{ "rates0_99": [99, 99, 51, 99], "levels0_99": [99, 99, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 78, "constMode0_1": 0, "freqCoarse0_31": 10, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [99, 99, 99, 99], "levels0_99": [99, 99, 99, 99], "detune_7_7": 0, "volumeLevel0_99": 87, "constMode0_1": 1, "freqCoarse0_31": 3, "freqFine0_99": 91, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [93, 22, 25, 48], "levels0_99": [99, 93, 0, 0], "detune_7_7": -4, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [93, 26, 19, 48], "levels0_99": [99, 93, 0, 0], "detune_7_7": -4, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [89, 22, 25, 48], "levels0_99": [99, 89, 0, 0], "detune_7_7": 4, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [89, 29, 19, 48], "levels0_99": [99, 92, 0, 0], "detune_7_7": 5, "volumeLevel0_99": 84, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "MULMI / BANK0000.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 14, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 54, 49, 49], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 94, "constMode0_1": 1, "freqCoarse0_31": 22, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [98, 98, 20, 15], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 1, "freqCoarse0_31": 23, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [75, 32, 33, 39], "levels0_99": [99, 80, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [91, 31, 60, 37], "levels0_99": [99, 27, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 68, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 32, 57, 40], "levels0_99": [96, 79, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 77, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [91, 31, 60, 32], "levels0_99": [99, 52, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 6, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "ACOU VOICE / BANK05.SYX", "lfoPitchModDepth0_99": 1, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 32, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 99, 99, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 50, 99, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": -3, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 16, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 99, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 4, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 99, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": -4, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 63, 62, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 1, "volumeLevel0_99": 72, "constMode0_1": 0, "freqCoarse0_31": 6, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 75, 99, 99], "levels0_99": [99, 99, 99, 0], "detune_7_7": 3, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 16, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "ChorsOrg1\\ / BANK0006.SYX", "lfoPitchModDepth0_99": 53, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 18, "feedback0_7": 7, "operators": [{ "rates0_99": [95, 62, 17, 58], "levels0_99": [99, 95, 32, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 20, 0, 0], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 61, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [88, 96, 32, 30], "levels0_99": [79, 65, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [90, 42, 7, 55], "levels0_99": [90, 30, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 97, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 0, 0, 0], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 57, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [94, 56, 24, 55], "levels0_99": [93, 28, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }], "name": "F SynBass1 / BASSEA.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 15, "feedback0_7": 7, "operators": [{ "rates0_99": [98, 51, 0, 54], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 6 }, { "rates0_99": [99, 69, 99, 60], "levels0_99": [90, 46, 49, 0], "detune_7_7": -7, "volumeLevel0_99": 67, "constMode0_1": 0, "freqCoarse0_31": 18, "freqFine0_99": 85, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [98, 34, 39, 51], "levels0_99": [99, 92, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [85, 41, 10, 51], "levels0_99": [98, 98, 98, 0], "detune_7_7": -6, "volumeLevel0_99": 72, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [85, 73, 10, 51], "levels0_99": [99, 92, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 71, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [72, 76, 48, 56], "levels0_99": [99, 92, 0, 0], "detune_7_7": -5, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }], "name": "MARIMBASS / BASSICS.SYX", "lfoPitchModDepth0_99": 10, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 25, "feedback0_7": 3, "operators": [{ "rates0_99": [77, 80, 74, 48], "levels0_99": [99, 97, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 99, 57, 64], "levels0_99": [57, 52, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [76, 80, 22, 63], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [73, 80, 22, 50], "levels0_99": [79, 99, 99, 0], "detune_7_7": -1, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [88, 68, 22, 75], "levels0_99": [60, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 80, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [89, 80, 22, 65], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 58, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }], "name": "SMALL1PIPE / CHURCH.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 26, "feedback0_7": 4, "operators": [{ "rates0_99": [86, 34, 14, 44], "levels0_99": [99, 87, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [82, 26, 17, 43], "levels0_99": [99, 84, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [82, 69, 22, 4], "levels0_99": [99, 91, 0, 0], "detune_7_7": -5, "volumeLevel0_99": 91, "constMode0_1": 0, "freqCoarse0_31": 10, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [83, 51, 18, 42], "levels0_99": [99, 94, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [75, 55, 19, 45], "levels0_99": [99, 94, 0, 0], "detune_7_7": 2, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [88, 29, 22, 4], "levels0_99": [99, 95, 0, 0], "detune_7_7": -7, "volumeLevel0_99": 76, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 2 }], "name": "BELLO 2 / CLANG1.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 19, "feedback0_7": 7, "operators": [{ "rates0_99": [50, 53, 44, 36], "levels0_99": [99, 99, 99, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [85, 53, 30, 35], "levels0_99": [99, 99, 99, 0], "detune_7_7": -7, "volumeLevel0_99": 63, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [84, 53, 45, 0], "levels0_99": [99, 99, 99, 0], "detune_7_7": -7, "volumeLevel0_99": 68, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 50, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [52, 53, 44, 36], "levels0_99": [99, 99, 99, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [35, 53, 44, 36], "levels0_99": [99, 99, 99, 0], "detune_7_7": 7, "volumeLevel0_99": 66, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 30, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [85, 75, 10, 0], "levels0_99": [99, 99, 59, 0], "detune_7_7": 7, "volumeLevel0_99": 70, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "FLOATING / CLAUDE.SYX", "lfoPitchModDepth0_99": 25, "lfoAmpModDepth0_99": 51 },
    { "algorithm1_32": 8, "feedback0_7": 7, "operators": [{ "rates0_99": [95, 62, 28, 58], "levels0_99": [99, 60, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 20, 0, 0], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 80, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 6, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [98, 36, 44, 56], "levels0_99": [99, 99, 0, 0], "detune_7_7": 2, "volumeLevel0_99": 91, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 30, 20, 54], "levels0_99": [99, 95, 0, 0], "detune_7_7": -2, "volumeLevel0_99": 78, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 77, 26, 48], "levels0_99": [99, 98, 0, 0], "detune_7_7": 3, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 85, 43, 71], "levels0_99": [99, 77, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 87, "constMode0_1": 0, "freqCoarse0_31": 15, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "BANJO / COUNTRY.SYX", "lfoPitchModDepth0_99": 1, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 3, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 35, 30, 46], "levels0_99": [99, 70, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [95, 42, 99, 28], "levels0_99": [99, 70, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 82, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [95, 50, 99, 35], "levels0_99": [99, 49, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 91, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [73, 17, 50, 60], "levels0_99": [99, 98, 96, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [58, 17, 50, 55], "levels0_99": [99, 98, 96, 0], "detune_7_7": 0, "volumeLevel0_99": 77, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [97, 81, 50, 55], "levels0_99": [99, 37, 20, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 9, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }], "name": "A.V.I.D. 3 / DXOC27.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 63 },
    { "algorithm1_32": 16, "feedback0_7": 5, "operators": [{ "rates0_99": [60, 71, 66, 65], "levels0_99": [82, 75, 95, 0], "detune_7_7": 0, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [59, 53, 62, 54], "levels0_99": [99, 60, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 92, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 15, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [53, 38, 75, 61], "levels0_99": [88, 44, 24, 0], "detune_7_7": 7, "volumeLevel0_99": 51, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [61, 25, 25, 60], "levels0_99": [99, 99, 97, 0], "detune_7_7": -7, "volumeLevel0_99": 71, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [65, 38, 0, 61], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 57, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [71, 64, 98, 61], "levels0_99": [99, 67, 52, 0], "detune_7_7": 1, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 76, "enabled": true, "velocitySens0_7": 2 }], "name": "FAIRLIGHT / DXOC27.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 28, "feedback0_7": 2, "operators": [{ "rates0_99": [63, 99, 99, 48], "levels0_99": [99, 99, 99, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [90, 99, 60, 0], "levels0_99": [99, 92, 64, 99], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [45, 99, 99, 47], "levels0_99": [99, 99, 99, 0], "detune_7_7": -3, "volumeLevel0_99": 95, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 70, 50, 0], "levels0_99": [96, 54, 65, 99], "detune_7_7": 7, "volumeLevel0_99": 90, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 99, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [50, 99, 50, 0], "levels0_99": [99, 99, 90, 99], "detune_7_7": -4, "volumeLevel0_99": 93, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 33, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [95, 70, 46, 44], "levels0_99": [99, 99, 60, 0], "detune_7_7": 1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }], "name": "JAPAN / ETHNIC.SYX", "lfoPitchModDepth0_99": 5, "lfoAmpModDepth0_99": 48 },
    { "algorithm1_32": 5, "feedback0_7": 3, "operators": [{ "rates0_99": [99, 54, 20, 85], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 54, 20, 85], "levels0_99": [99, 18, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 63, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 54, 20, 85], "levels0_99": [99, 7, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 54, 20, 85], "levels0_99": [89, 49, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 9, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [80, 30, 20, 65], "levels0_99": [99, 80, 65, 0], "detune_7_7": 0, "volumeLevel0_99": 75, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [64, 35, 20, 30], "levels0_99": [99, 18, 17, 0], "detune_7_7": 0, "volumeLevel0_99": 85, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }], "name": "3-SPLIT / FORRICK.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 10, "feedback0_7": 4, "operators": [{ "rates0_99": [99, 25, 10, 50], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [63, 0, 25, 0], "levels0_99": [99, 75, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 86, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [90, 46, 32, 32], "levels0_99": [99, 44, 37, 91], "detune_7_7": 1, "volumeLevel0_99": 82, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [99, 47, 68, 64], "levels0_99": [99, 34, 0, 0], "detune_7_7": -1, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [90, 71, 33, 31], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 94, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [78, 71, 58, 36], "levels0_99": [99, 0, 0, 0], "detune_7_7": 1, "volumeLevel0_99": 78, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }], "name": "GUITAR 4 / GUITAR1.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 5, "feedback0_7": 7, "operators": [{ "rates0_99": [99, 45, 27, 51], "levels0_99": [99, 99, 0, 0], "detune_7_7": 6, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [99, 58, 18, 36], "levels0_99": [99, 93, 0, 0], "detune_7_7": 6, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [99, 62, 24, 50], "levels0_99": [99, 99, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 45, 6, 50], "levels0_99": [99, 95, 0, 0], "detune_7_7": -4, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [99, 60, 65, 46], "levels0_99": [99, 95, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 13, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }, { "rates0_99": [99, 99, 76, 59], "levels0_99": [99, 99, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 31, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 7 }], "name": "PIANOMRMBA / ORTEGA1.SYX", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 19, "feedback0_7": 6, "operators": [{ "rates0_99": [66, 25, 30, 30], "levels0_99": [99, 94, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [69, 46, 99, 12], "levels0_99": [99, 70, 0, 0], "detune_7_7": -4, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [95, 50, 44, 10], "levels0_99": [99, 70, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 10, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [95, 33, 49, 33], "levels0_99": [99, 70, 0, 0], "detune_7_7": -2, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [95, 36, 99, 28], "levels0_99": [99, 70, 0, 0], "detune_7_7": 5, "volumeLevel0_99": 79, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [95, 49, 28, 24], "levels0_99": [94, 79, 0, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 15, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }], "name": "SliverAple / SynprezFM_19.syx", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 5, "feedback0_7": 0, "operators": [{ "rates0_99": [62, 69, 15, 69], "levels0_99": [23, 97, 79, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [62, 69, 15, 69], "levels0_99": [23, 97, 76, 0], "detune_7_7": 0, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [43, 69, 15, 69], "levels0_99": [99, 97, 75, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 1, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [62, 69, 15, 69], "levels0_99": [23, 97, 79, 0], "detune_7_7": 3, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [62, 69, 15, 69], "levels0_99": [23, 97, 75, 0], "detune_7_7": 7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 69, 15, 69], "levels0_99": [23, 97, 75, 0], "detune_7_7": -7, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }], "name": "LEADSYN 1 / SYNTHS32.SYX", "lfoPitchModDepth0_99": 53, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 9, "feedback0_7": 6, "operators": [{ "rates0_99": [65, 48, 45, 41], "levels0_99": [99, 99, 99, 0], "detune_7_7": 6, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [50, 26, 9, 36], "levels0_99": [94, 99, 94, 0], "detune_7_7": 7, "volumeLevel0_99": 70, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [64, 40, 23, 42], "levels0_99": [99, 97, 94, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [70, 27, 16, 39], "levels0_99": [90, 99, 94, 0], "detune_7_7": -6, "volumeLevel0_99": 82, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [70, 27, 16, 40], "levels0_99": [90, 99, 95, 0], "detune_7_7": 7, "volumeLevel0_99": 65, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [70, 27, 16, 31], "levels0_99": [90, 99, 94, 0], "detune_7_7": -6, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }], "name": "Digi Pad \\ / vrc110bBo Tomlyn Selection.syx", "lfoPitchModDepth0_99": 11, "lfoAmpModDepth0_99": 0 },
    { "algorithm1_32": 3, "feedback0_7": 0, "operators": [{ "rates0_99": [95, 48, 49, 62], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 95, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [99, 72, 0, 0], "levels0_99": [82, 48, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 96, "constMode0_1": 0, "freqCoarse0_31": 5, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 0 }, { "rates0_99": [95, 26, 49, 57], "levels0_99": [99, 0, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 73, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 1 }, { "rates0_99": [95, 33, 49, 57], "levels0_99": [99, 92, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 75, 0, 8], "levels0_99": [82, 48, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 93, "constMode0_1": 0, "freqCoarse0_31": 1, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [0, 63, 55, 0], "levels0_99": [78, 78, 0, 0], "detune_7_7": 0, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 13, "enabled": true, "velocitySens0_7": 2 }], "name": "O-F-SEQ 1 / vrc112aLive 64 - Akira Inoue.syx", "lfoPitchModDepth0_99": 99, "lfoAmpModDepth0_99": 99 },
    { "algorithm1_32": 4, "feedback0_7": 0, "operators": [{ "rates0_99": [99, 48, 38, 43], "levels0_99": [99, 94, 0, 0], "detune_7_7": -5, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 2, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 5 }, { "rates0_99": [99, 51, 11, 24], "levels0_99": [99, 79, 2, 0], "detune_7_7": -4, "volumeLevel0_99": 74, "constMode0_1": 0, "freqCoarse0_31": 3, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 48, 20, 39], "levels0_99": [94, 79, 2, 2], "detune_7_7": -2, "volumeLevel0_99": 98, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 6, "enabled": true, "velocitySens0_7": 2 }, { "rates0_99": [99, 64, 43, 45], "levels0_99": [99, 94, 0, 0], "detune_7_7": 5, "volumeLevel0_99": 99, "constMode0_1": 0, "freqCoarse0_31": 0, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 3 }, { "rates0_99": [99, 51, 11, 23], "levels0_99": [99, 79, 2, 0], "detune_7_7": 4, "volumeLevel0_99": 72, "constMode0_1": 0, "freqCoarse0_31": 4, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }, { "rates0_99": [99, 55, 19, 37], "levels0_99": [94, 79, 0, 2], "detune_7_7": 6, "volumeLevel0_99": 93, "constMode0_1": 0, "freqCoarse0_31": 8, "freqFine0_99": 0, "enabled": true, "velocitySens0_7": 4 }], "name": "DIGI LOG / vrc112aLive 64 - Akira Inoue.syx", "lfoPitchModDepth0_99": 0, "lfoAmpModDepth0_99": 0 },
    {
        "algorithm1_32": 4,
        "feedback0_7": 3,
        "operators": [
            {
                "rates0_99": [
                    79,
                    28,
                    24,
                    33
                ],
                "levels0_99": [
                    99,
                    30,
                    0,
                    0
                ],
                "detune_7_7": -6,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            },
            {
                "rates0_99": [
                    74,
                    38,
                    17,
                    35
                ],
                "levels0_99": [
                    99,
                    95,
                    0,
                    0
                ],
                "detune_7_7": 1,
                "volumeLevel0_99": 74,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 99,
                "enabled": true,
                "velocitySens0_7": 2
            },
            {
                "rates0_99": [
                    60,
                    53,
                    22,
                    4
                ],
                "levels0_99": [
                    99,
                    91,
                    0,
                    0
                ],
                "detune_7_7": -4,
                "volumeLevel0_99": 85,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 3
            },
            {
                "rates0_99": [
                    80,
                    28,
                    35,
                    35
                ],
                "levels0_99": [
                    99,
                    33,
                    0,
                    0
                ],
                "detune_7_7": 1,
                "volumeLevel0_99": 91,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 1,
                "enabled": true,
                "velocitySens0_7": 1
            },
            {
                "rates0_99": [
                    69,
                    55,
                    19,
                    35
                ],
                "levels0_99": [
                    99,
                    94,
                    0,
                    0
                ],
                "detune_7_7": 4,
                "volumeLevel0_99": 88,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 3
            },
            {
                "rates0_99": [
                    74,
                    22,
                    22,
                    4
                ],
                "levels0_99": [
                    88,
                    1,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 73,
                "constMode0_1": 0,
                "freqCoarse0_31": 8,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 1
            }
        ],
        "name": "ClasGitar+ / BASSEA.SYX",
        "lfoPitchModDepth0_99": 0,
        "lfoAmpModDepth0_99": 0
    },
    {
        "algorithm1_32": 6,
        "feedback0_7": 0,
        "operators": [
            {
                "rates0_99": [
                    60,
                    25,
                    25,
                    71
                ],
                "levels0_99": [
                    99,
                    99,
                    98,
                    0
                ],
                "detune_7_7": 2,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    97,
                    62,
                    54
                ],
                "levels0_99": [
                    99,
                    99,
                    90,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 88,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    57,
                    97,
                    62,
                    54
                ],
                "levels0_99": [
                    99,
                    99,
                    90,
                    0
                ],
                "detune_7_7": -2,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 2,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    99,
                    25,
                    50
                ],
                "levels0_99": [
                    99,
                    99,
                    99,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 77,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    66,
                    99,
                    99,
                    51
                ],
                "levels0_99": [
                    99,
                    99,
                    99,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 86,
                "constMode0_1": 0,
                "freqCoarse0_31": 2,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    99,
                    99,
                    45
                ],
                "levels0_99": [
                    99,
                    99,
                    99,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 84,
                "constMode0_1": 0,
                "freqCoarse0_31": 4,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            }
        ],
        "name": "PIPES 5 / CHURCH.SYX",
        "lfoPitchModDepth0_99": 0,
        "lfoAmpModDepth0_99": 0
    },
    {
        "algorithm1_32": 29,
        "feedback0_7": 7,
        "operators": [
            {
                "rates0_99": [
                    45,
                    25,
                    25,
                    36
                ],
                "levels0_99": [
                    99,
                    99,
                    98,
                    0
                ],
                "detune_7_7": 7,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    97,
                    62,
                    47
                ],
                "levels0_99": [
                    99,
                    99,
                    90,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 90,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    97,
                    62,
                    47
                ],
                "levels0_99": [
                    99,
                    99,
                    90,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 75,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    61,
                    25,
                    25,
                    50
                ],
                "levels0_99": [
                    99,
                    99,
                    97,
                    0
                ],
                "detune_7_7": 7,
                "volumeLevel0_99": 88,
                "constMode0_1": 0,
                "freqCoarse0_31": 4,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    61,
                    25,
                    25,
                    61
                ],
                "levels0_99": [
                    99,
                    99,
                    93,
                    0
                ],
                "detune_7_7": 7,
                "volumeLevel0_99": 97,
                "constMode0_1": 0,
                "freqCoarse0_31": 2,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    72,
                    25,
                    25,
                    70
                ],
                "levels0_99": [
                    99,
                    99,
                    99,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 76,
                "constMode0_1": 0,
                "freqCoarse0_31": 10,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            }
        ],
        "name": "PIPES 6 / CHURCH.SYX",
        "lfoPitchModDepth0_99": 0,
        "lfoAmpModDepth0_99": 0
    },
    {
        "algorithm1_32": 6,
        "feedback0_7": 4,
        "operators": [
            {
                "rates0_99": [
                    99,
                    0,
                    7,
                    31
                ],
                "levels0_99": [
                    99,
                    99,
                    92,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    68,
                    97,
                    32
                ],
                "levels0_99": [
                    99,
                    99,
                    99,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 76,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 1,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    0,
                    7,
                    31
                ],
                "levels0_99": [
                    99,
                    99,
                    92,
                    0
                ],
                "detune_7_7": 7,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    68,
                    97,
                    32
                ],
                "levels0_99": [
                    99,
                    99,
                    99,
                    0
                ],
                "detune_7_7": -7,
                "volumeLevel0_99": 88,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 1,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    0,
                    7,
                    31
                ],
                "levels0_99": [
                    99,
                    99,
                    92,
                    0
                ],
                "detune_7_7": -6,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    11,
                    14,
                    2
                ],
                "levels0_99": [
                    99,
                    99,
                    88,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 97,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 1,
                "enabled": true,
                "velocitySens0_7": 0
            }
        ],
        "name": "SYNTHYX / DXOC24.SYX",
        "lfoPitchModDepth0_99": 99,
        "lfoAmpModDepth0_99": 20
    },
    {
        "algorithm1_32": 5,
        "feedback0_7": 7,
        "operators": [
            {
                "rates0_99": [
                    80,
                    35,
                    30,
                    40
                ],
                "levels0_99": [
                    95,
                    99,
                    95,
                    0
                ],
                "detune_7_7": 7,
                "volumeLevel0_99": 95,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            },
            {
                "rates0_99": [
                    50,
                    25,
                    32,
                    40
                ],
                "levels0_99": [
                    90,
                    99,
                    40,
                    40
                ],
                "detune_7_7": -5,
                "volumeLevel0_99": 74,
                "constMode0_1": 0,
                "freqCoarse0_31": 3,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            },
            {
                "rates0_99": [
                    75,
                    35,
                    30,
                    40
                ],
                "levels0_99": [
                    95,
                    99,
                    80,
                    0
                ],
                "detune_7_7": 2,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            },
            {
                "rates0_99": [
                    80,
                    35,
                    30,
                    40
                ],
                "levels0_99": [
                    99,
                    95,
                    95,
                    0
                ],
                "detune_7_7": 2,
                "volumeLevel0_99": 90,
                "constMode0_1": 0,
                "freqCoarse0_31": 3,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            },
            {
                "rates0_99": [
                    7,
                    35,
                    30,
                    40
                ],
                "levels0_99": [
                    95,
                    99,
                    99,
                    0
                ],
                "detune_7_7": -5,
                "volumeLevel0_99": 70,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            },
            {
                "rates0_99": [
                    70,
                    53,
                    30,
                    28
                ],
                "levels0_99": [
                    90,
                    85,
                    85,
                    0
                ],
                "detune_7_7": 7,
                "volumeLevel0_99": 99,
                "constMode0_1": 1,
                "freqCoarse0_31": 3,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            }
        ],
        "name": "Marvin / MAGAZINE.SYX",
        "lfoPitchModDepth0_99": 0,
        "lfoAmpModDepth0_99": 0
    },
    {
        "algorithm1_32": 18,
        "feedback0_7": 7,
        "operators": [
            {
                "rates0_99": [
                    95,
                    62,
                    17,
                    58
                ],
                "levels0_99": [
                    99,
                    95,
                    32,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    20,
                    0,
                    0
                ],
                "levels0_99": [
                    99,
                    0,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 84,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    88,
                    96,
                    32,
                    30
                ],
                "levels0_99": [
                    79,
                    65,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 68,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    90,
                    42,
                    7,
                    55
                ],
                "levels0_99": [
                    90,
                    30,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 62,
                "constMode0_1": 0,
                "freqCoarse0_31": 5,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    0,
                    0,
                    0
                ],
                "levels0_99": [
                    99,
                    0,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 68,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    94,
                    56,
                    24,
                    55
                ],
                "levels0_99": [
                    93,
                    28,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 65,
                "constMode0_1": 0,
                "freqCoarse0_31": 4,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            }
        ],
        "name": "BASSdb3 / ATSU_4.SYX",
        "lfoPitchModDepth0_99": 0,
        "lfoAmpModDepth0_99": 0
    },
    {
        "algorithm1_32": 18,
        "feedback0_7": 7,
        "operators": [
            {
                "rates0_99": [
                    95,
                    62,
                    17,
                    58
                ],
                "levels0_99": [
                    99,
                    95,
                    32,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    20,
                    0,
                    0
                ],
                "levels0_99": [
                    99,
                    0,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 88,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    88,
                    96,
                    32,
                    30
                ],
                "levels0_99": [
                    79,
                    65,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 95,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    90,
                    42,
                    7,
                    55
                ],
                "levels0_99": [
                    90,
                    30,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 81,
                "constMode0_1": 0,
                "freqCoarse0_31": 5,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    99,
                    0,
                    0,
                    0
                ],
                "levels0_99": [
                    99,
                    0,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 57,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    94,
                    56,
                    24,
                    55
                ],
                "levels0_99": [
                    93,
                    28,
                    0,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            }
        ],
        "name": "DBBASS  1 / ATSU_5.SYX",
        "lfoPitchModDepth0_99": 0,
        "lfoAmpModDepth0_99": 0
    },
    {
        "algorithm1_32": 3,
        "feedback0_7": 0,
        "operators": [
            {
                "rates0_99": [
                    91,
                    32,
                    28,
                    49
                ],
                "levels0_99": [
                    99,
                    93,
                    0,
                    0
                ],
                "detune_7_7": -4,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 3
            },
            {
                "rates0_99": [
                    75,
                    21,
                    27,
                    72
                ],
                "levels0_99": [
                    91,
                    90,
                    0,
                    0
                ],
                "detune_7_7": -4,
                "volumeLevel0_99": 83,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            },
            {
                "rates0_99": [
                    95,
                    30,
                    27,
                    72
                ],
                "levels0_99": [
                    83,
                    77,
                    0,
                    0
                ],
                "detune_7_7": -3,
                "volumeLevel0_99": 54,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 7
            },
            {
                "rates0_99": [
                    90,
                    84,
                    28,
                    55
                ],
                "levels0_99": [
                    99,
                    97,
                    0,
                    0
                ],
                "detune_7_7": -5,
                "volumeLevel0_99": 88,
                "constMode0_1": 0,
                "freqCoarse0_31": 2,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 4
            },
            {
                "rates0_99": [
                    98,
                    79,
                    43,
                    2
                ],
                "levels0_99": [
                    91,
                    90,
                    0,
                    0
                ],
                "detune_7_7": -5,
                "volumeLevel0_99": 12,
                "constMode0_1": 0,
                "freqCoarse0_31": 11,
                "freqFine0_99": 64,
                "enabled": true,
                "velocitySens0_7": 7
            },
            {
                "rates0_99": [
                    90,
                    58,
                    28,
                    52
                ],
                "levels0_99": [
                    89,
                    99,
                    0,
                    0
                ],
                "detune_7_7": -1,
                "volumeLevel0_99": 88,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 7
            }
        ],
        "name": "Bass Guitr / BANK01.SYX",
        "lfoPitchModDepth0_99": 0,
        "lfoAmpModDepth0_99": 0
    },
    {
        "algorithm1_32": 9,
        "feedback0_7": 6,
        "operators": [
            {
                "rates0_99": [
                    65,
                    99,
                    99,
                    41
                ],
                "levels0_99": [
                    99,
                    99,
                    99,
                    0
                ],
                "detune_7_7": 6,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    50,
                    26,
                    9,
                    36
                ],
                "levels0_99": [
                    94,
                    99,
                    94,
                    0
                ],
                "detune_7_7": 7,
                "volumeLevel0_99": 86,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 1
            },
            {
                "rates0_99": [
                    64,
                    40,
                    23,
                    42
                ],
                "levels0_99": [
                    99,
                    97,
                    94,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    70,
                    27,
                    16,
                    39
                ],
                "levels0_99": [
                    90,
                    99,
                    94,
                    0
                ],
                "detune_7_7": -6,
                "volumeLevel0_99": 82,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    70,
                    27,
                    16,
                    40
                ],
                "levels0_99": [
                    90,
                    99,
                    95,
                    0
                ],
                "detune_7_7": 7,
                "volumeLevel0_99": 65,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    53,
                    27,
                    16,
                    31
                ],
                "levels0_99": [
                    90,
                    99,
                    94,
                    0
                ],
                "detune_7_7": -6,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 2,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            }
        ],
        "name": "MOOG-52  1 / DXMIK2.SYX",
        "lfoPitchModDepth0_99": 11,
        "lfoAmpModDepth0_99": 0
    },
    {
        "algorithm1_32": 17,
        "feedback0_7": 6,
        "operators": [
            {
                "rates0_99": [
                    72,
                    30,
                    25,
                    51
                ],
                "levels0_99": [
                    99,
                    92,
                    90,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 99,
                "constMode0_1": 0,
                "freqCoarse0_31": 1,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 1
            },
            {
                "rates0_99": [
                    99,
                    71,
                    35,
                    51
                ],
                "levels0_99": [
                    82,
                    92,
                    88,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 92,
                "constMode0_1": 0,
                "freqCoarse0_31": 2,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 1
            },
            {
                "rates0_99": [
                    50,
                    52,
                    35,
                    41
                ],
                "levels0_99": [
                    99,
                    92,
                    91,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 61,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 1
            },
            {
                "rates0_99": [
                    96,
                    19,
                    20,
                    54
                ],
                "levels0_99": [
                    99,
                    92,
                    89,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 79,
                "constMode0_1": 0,
                "freqCoarse0_31": 4,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 0
            },
            {
                "rates0_99": [
                    98,
                    67,
                    38,
                    54
                ],
                "levels0_99": [
                    86,
                    92,
                    74,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 73,
                "constMode0_1": 0,
                "freqCoarse0_31": 0,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 1
            },
            {
                "rates0_99": [
                    99,
                    64,
                    44,
                    54
                ],
                "levels0_99": [
                    99,
                    92,
                    56,
                    0
                ],
                "detune_7_7": 0,
                "volumeLevel0_99": 84,
                "constMode0_1": 0,
                "freqCoarse0_31": 8,
                "freqFine0_99": 0,
                "enabled": true,
                "velocitySens0_7": 2
            }
        ],
        "name": "F Bass  10 / BASSEA.SYX",
        "lfoPitchModDepth0_99": 0,
        "lfoAmpModDepth0_99": 15
    }
];
libForDX7list.sort((a, b) => {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
});
let allFMPresets = [];
let loader = new DX7Loader();
for (let ii = 0; ii < libForDX7list.length; ii++) {
    allFMPresets.push(loader.convertDX7data(libForDX7list[ii]));
}
class DX7UI {
    constructor() {
        this.id = '';
        this.volumeValue = 100;
        this.preset = null;
        window.addEventListener('message', this.receiveHostMessage.bind(this), false);
        var message = { dialogID: '', pluginData: '', done: false, screenWait: false };
        window.parent.postMessage(message, '*');
        let me = this;
        this.titleText = document.getElementById('presettitle');
        this.fileInput = document.getElementById('fileInput');
        this.volumeLabel = document.getElementById('volumeValue');
        this.resetVolumeLabel();
        this.transposeLabel = document.getElementById('transposeValue');
        this.fileInput.addEventListener('change', (changeEvent) => {
            let file = changeEvent.target.files[0];
            let fname = file.name.trim().toLowerCase();
            if (fname.endsWith('.syx')) {
                this.importSys(file);
            }
            else {
                if (fname.endsWith('.txt')) {
                    this.importTxt(file);
                }
                else {
                    if (fname.endsWith('.json')) {
                        this.importJson(file);
                    }
                    else {
                        alert('Only .syx|.txt|.json');
                    }
                }
            }
        });
        let loader = new DX7Loader();
        this.preset = allFMPresets[32];
        this.titleText.innerHTML = this.preset.label;
        this.renderLibList();
        this.resetTransposeLabel();
    }
    importSys(file) {
        let me = this;
        let loader = new DX7Loader();
        loader.loadSyxFile(file, (dx7presets) => {
            for (var ii = 0; ii < dx7presets.length; ii++) {
                console.log(ii, dx7presets[ii]);
                allFMPresets.splice(0, 0, loader.convertDX7data(dx7presets[ii]));
            }
            me.renderLibList();
        });
    }
    importTxt(file) {
        let loader = new DX7Loader();
        loader.loadTxtFile(file, (dx7preset) => {
            console.log(dx7preset);
            allFMPresets.splice(0, 0, loader.convertDX7data(dx7preset));
            this.renderLibList();
        });
    }
    importJson(file) {
        let loader = new DX7Loader();
        loader.loadJSONFile(file, (preset) => {
            console.log(preset);
            allFMPresets.splice(0, 0, preset);
            this.renderLibList();
        });
    }
    parseHostData(data) {
        if (data) {
            if (data.preset) {
                if (data.preset.operators) {
                    if (data.preset.operators.length == 6) {
                        return data;
                    }
                }
            }
        }
        return null;
    }
    receiveHostMessage(messageEvent) {
        let message = messageEvent.data;
        if (this.id) {
            let data = this.parseHostData(message.hostData);
            if (data) {
                console.log('receiveHostMessage', data);
                this.volumeValue = data.volume;
                this.preset = data.preset;
                this.titleText.innerHTML = this.preset.label;
                this.resetVolumeLabel();
                this.resetTransposeLabel();
            }
        }
        else {
            this.id = message.hostData;
        }
    }
    renderLibList() {
        let liblist = document.getElementById('liblist');
        let me = this;
        if (liblist) {
            while (liblist.lastElementChild) {
                liblist.removeChild(liblist.lastElementChild);
            }
            for (let ii = 0; ii < allFMPresets.length; ii++) {
                let li = document.createElement('li');
                li.innerText = '' + (1 + ii) + '. ' + allFMPresets[ii].label;
                let pid = ii;
                li.onclick = () => {
                    let selectedPreset = allFMPresets[pid];
                    console.log(pid, selectedPreset);
                    me.preset = selectedPreset;
                    let par = {
                        volume: me.volumeValue, preset: me.preset
                    };
                    this.sendPresetToHost(par);
                    this.titleText.innerHTML = me.preset.label;
                    this.resetTransposeLabel();
                };
                liblist.appendChild(li);
            }
        }
    }
    importFile() {
        console.log('importFile');
        this.fileInput.click();
    }
    minusVolume() {
        console.log('minusVolume', this.volumeValue);
        if (this.volumeValue < 10) {
            this.volumeValue = 10;
        }
        if (this.preset) {
            this.volumeValue = this.volumeValue - 10;
            this.resetVolumeLabel();
            let par = {
                volume: this.volumeValue, preset: this.preset
            };
            this.sendPresetToHost(par);
        }
    }
    plusVolume() {
        console.log('plusVolume', this.volumeValue);
        if (this.volumeValue > 140) {
            this.volumeValue = 140;
        }
        if (this.preset) {
            this.volumeValue = this.volumeValue + 10;
            this.resetVolumeLabel();
            let par = {
                volume: this.volumeValue, preset: this.preset
            };
            this.sendPresetToHost(par);
        }
    }
    minusOctave() {
        console.log('minusOctave');
        if (this.preset) {
            if (this.preset.transpose > -1) {
                this.preset.transpose = this.preset.transpose - 1;
                this.resetTransposeLabel();
                let par = {
                    volume: this.volumeValue, preset: this.preset
                };
                this.sendPresetToHost(par);
            }
        }
    }
    plusOctave() {
        console.log('plusOctave');
        if (this.preset) {
            if (this.preset.transpose < 1) {
                this.preset.transpose = this.preset.transpose + 1;
                this.resetTransposeLabel();
                let par = {
                    volume: this.volumeValue, preset: this.preset
                };
                this.sendPresetToHost(par);
            }
        }
    }
    resetTransposeLabel() {
        let txt = '?';
        if (this.preset) {
            if (this.preset.transpose > 0) {
                txt = 'octave up';
            }
            if (this.preset.transpose < 0) {
                txt = 'octave down';
            }
            if (this.preset.transpose == 0) {
                txt = 'none';
            }
        }
        this.transposeLabel.innerText = '' + txt;
    }
    resetVolumeLabel() {
        this.volumeLabel.innerText = '' + this.volumeValue;
    }
    sendPresetToHost(par) {
        console.log('sendPresetToHost', par);
        var message = { dialogID: this.id, pluginData: par, done: false, screenWait: false };
        window.parent.postMessage(message, '*');
    }
}
//# sourceMappingURL=dx7selector.js.map