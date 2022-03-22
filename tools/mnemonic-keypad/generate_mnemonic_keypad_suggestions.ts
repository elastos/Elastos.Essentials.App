const { existsSync, mkdirSync, writeFileSync } = require("fs");
const { join } = require("path");
const hanziConvert = require('hanzi-to-pinyin');

type AsciiMapping = {
    [alphabetLetters: string]: string[]; // eg: "hao" -> [好, 号]
}

const keypadAssetsFolder = join(__dirname, "../../src/assets/components/mnemonic-keypad");
if (!existsSync(keypadAssetsFolder))
    mkdirSync(keypadAssetsFolder);

/**
 * From the BIP39 mnemonic words list, generates pre-built files ready to use for the
 * essentials mnemonic keypad feature.
 *
 * Those lists are a mapping between alphabet letters without accent (french), or in
 * pinyin (chinese), to their real mnemonic words.
 * Eg:
 * - English: "start" -> ["start"]
 * - French: "ecouter" -> ["écouter"]
 * - Chinese: "hao" -> [好, 号]
 *
 * Generated files are copied into Essentials assets/ folder and imported by essentials
 * for the mnemonic keypad feature.
 */
class MnemonicKeypadSuggestionsGenerator {
    public async generate() {
        await this.generateSimplifiedChinese();
        await this.generateFrench();
    }

    private async generateSimplifiedChinese(): Promise<void> {
        let chineseList: AsciiMapping = {};

        return new Promise(async (resolve) => {
            let words = require("bip39/src/wordlists/chinese_simplified.json");
            let mnemonicWords = Array.from(words) as string[];

            for (let w of mnemonicWords) {
                let convertResult = await hanziConvert(w) as string;
                let asciiWord: string;
                // Can return arrays of strings, or arrays of arrays os strings (in case of multiple pinyin for the same hanzi word)
                if (typeof convertResult[0] === "string")
                    asciiWord = convertResult[0]
                else
                    asciiWord = convertResult[0][0];

                asciiWord = asciiWord.normalize("NFC")
                    .replaceAll(/ā/g, "a").replaceAll(/à/g, "a").replaceAll(/ǎ/g, "a").replaceAll(/á/g, "a")
                    .replaceAll(/ē/g, "e").replaceAll(/é/g, "e").replaceAll(/è/g, "e").replaceAll(/ě/g, "e")
                    .replaceAll(/ú/g, "u").replaceAll(/ū/g, "u").replaceAll(/ǔ/g, "u").replaceAll(/ù/g, "u").replaceAll(/ǚ/g, "u")
                    .replaceAll(/ō/g, "o").replaceAll(/ó/g, "o").replaceAll(/ò/g, "o").replaceAll(/ǒ/g, "o")
                    .replaceAll(/ì/g, "i").replaceAll(/ī/g, "i").replaceAll(/ǐ/g, "i").replaceAll(/í/g, "i")

                // Fill the mapping
                if (!(asciiWord in chineseList))
                    chineseList[asciiWord] = [];

                chineseList[asciiWord].push(w);
            }

            writeFileSync(`${keypadAssetsFolder}/simplified_chinese.json`, JSON.stringify(chineseList, null, "  "));

            resolve();
        });
    }

    private generateFrench(): Promise<void> {
        let frenchList: AsciiMapping = {};

        return new Promise(resolve => {
            let words = require("bip39/src/wordlists/french.json");
            let mnemonicWords = Array.from(words) as string[];

            mnemonicWords.forEach(w => {
                // Replace accentuated chars with unaccentuated ascii letters
                let asciiWord = w.normalize("NFC")
                    .replaceAll(/é/g, "e")
                    .replaceAll(/è/g, "e");

                // Fill the mapping
                if (!(asciiWord in frenchList))
                    frenchList[asciiWord] = [];

                frenchList[asciiWord].push(w);
            });

            writeFileSync(`${keypadAssetsFolder}/french.json`, JSON.stringify(frenchList, null, "  "));

            resolve();
        });
    }
}

new MnemonicKeypadSuggestionsGenerator().generate();