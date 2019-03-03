const fs = require('fs');
const words = {};

const vocabIndex = {"4.01":"水","3.02":"小","6.01":"向","5.01":"宁","6.02":"地","6.03":"自","3.16":"己","5.02":"立","6.04":"她","2.03":"了","3.12":"下","6.05":"那","5.03":"外","5.04":"丝","6.06":"有","6.07":"冲","5.05":"平","6.08":"因","4.02":"为","4.03":"太","6.09":"好","4.04":"以","4.05":"长","4.06":"不","5.06":"东","6.10":"西","6.11":"回","5.07":"包","6.12":"多","3.01":"子","6.13":"曲","4.07":"历","6.14":"尽","3.05":"千","3.07":"也","4.08":"心","5.08":"甘","6.15":"再","6.16":"过","3.13":"久","6.17":"成","4.09":"从","6.18":"此","5.09":"世","1.01":"一","5.10":"叶","4.10":"木","6.19":"先","5.11":"生","6.20":"问","5.12":"他","5.13":"们","6.21":"在","3.14":"之","4.11":"天","4.12":"片","3.03":"上","4.13":"无","4.14":"比","6.22":"后","6.23":"老","6.24":"托","4.15":"风","6.25":"传","4.16":"方","4.17":"巨","3.15":"大","3.10":"干","4.18":"月","6.26":"光","5.14":"未","3.09":"么","6.27":"名","5.15":"发","4.19":"云","6.28":"朵","6.29":"当","6.30":"次","4.20":"见","5.16":"失","2.01":"二","3.04":"已","2.02":"人","3.06":"丈"," ":"","2.04":"几","3.08":"个","3.11":"才","2.05":"又","3.18":"口","3.19":"门","3.20":"工","8.01":"鱼","9.01":"看","8.02":"所","8.03":"和","9.02":"显","8.04":"变","9.03":"亮","7.01":"丽","8.05":"的","7.02":"身","9.04":"诱","8.06":"表","9.05":"虽","7.03":"但","7.04":"还","9.06":"是","9.07":"觉","9.08":"点","7.05":"冷","9.09":"洗","8.07":"泡","9.10":"很","8.08":"饱","7.06":"饭","7.07":"忘","8.09":"抱","7.08":"我","9.11":"相","7.09":"层","7.10":"没","8.10":"到","9.12":"将","8.11":"拥","7.11":"怀","7.12":"里","7.13":"这","7.14":"时","7.15":"足","7.16":"矣","11.01":"堂","11.02":"域","3.17":"女","11.03":"混","12.01":"温","10.01":"浪","10.02":"浴","11.04":"唯","10.03":"桑","10.04":"拿","10.05":"特","12.02":"期","12.03":"就","10.06":"旅","12.04":"游","10.07":"通","10.08":"部","11.05":"常","12.05":"然","10.09":"离","11.06":"眼","10.10":"被","11.07":"移","11.08":"理","10.11":"调","10.12":"换","12.06":"最","12.07":"遍","10.13 ":"能","12.08":"等","11.09":"率","12.09":"道","11.10":"排","11.11":"第","11.12":"偶","12.10":"遇","11.13":"得","11.14":"脸","12.11":"提","11.15":"盖","10.14":"流","11.16":"着","10.02 ":"浴","11.17":"随","12.12":"程","11.18":"捺","11.19":"情","11.20":"假","11.21":"断","12.13":"落","10.15":"真"}
const parsingBlackList = [ '灵' ];
let newWord;
let key;
let i = 0;
let def;
let note;
let parsingPersonalNote = false;

function reset() {
    i = 0;
    def = null;
}

function beginsWithChineseChar(line) {
    return line.match(/^[\u4E00-\u9FCC]/);
}

function wrapFirstLine(text, withThis) {
    let nomatch = false;
    return text.split('\n').map((line, i) => {
        if ( line.indexOf( '#' ) > -1 || line.indexOf( '*' ) === 0 ) {
            return line;
        } else if ( !nomatch ) {
            nomatch = true;
            return line.replace( /^([^\!\n]+[!]?) */, withThis + '$1' + withThis + ' ' );
        } else {
            return line;
        }
    }).join('\n');
}
function boldFirstLine(text) {
    return wrapFirstLine(text, '**');
}

function correctReferences(text) {
    return text.replace(/5.13 他/g, '5.12 他')
}
function markReferenceLinks(text) {
    return correctReferences(text).replace(/([0-9])+\.([0-9]+) ([\u4E00-\u9FCC]+)/g, '[$1.$2 $3]($1-$2.html)')
        .replace( /([^\[])([0-9])+\.([0-9]+)/g, '$1[$2.$3]($2-$3.html)' );
}

function makeLists(text) {
    return text.replace(/\u0003/g, '\n' ).split( '\n' ).map((line, i) => {
        const isListHeader = line.match(/: *$/);
        const re = /^([\u4E00-\u9FCC]+ .*$)/;
        if ( line.match(/###/) ) {
            return line;
        } else if ( isListHeader ) {
            return '\n**' + line.replace( /: *$/, ':' ) + '**';
        } else {
            return line.match(re) ? line.replace(re, '- $1') :
            (line === '' ? line : '\n' + line );
        }
        } ).join('\n');
}

function toMarkdown(text) {
    return markReferenceLinks( text.replace( /[<>]/g, '*' ) ).replace( /([0-9]+)\)/g, '$1.');
}

function pushDefinition() {
    if ( def ) {
        const defBody = toMarkdown(def.text.join( '\n' ));
        def.text = beginsWithChineseChar(defBody) ? defBody : wrapFirstLine(defBody, '**');
        if ( def.text.trim().length > 0 ) {
            newWord.definitions.push( def );
        }
        def = null;
    }
}

function fixKeyInWord(newWord) {
    const key = Object.keys(vocabIndex).filter((key) => {
        return vocabIndex[key] === newWord.char;
    });
    if ( key[0] ) {
        newWord.key = key[0].trim();
        //console.log(`${newWord.char} new key: ${newWord.key}`);
    } else if ( parsingBlackList.indexOf(newWord.char) === -1 ) {
        console.warn( `Could not correct key for ${newWord.key}` );
    }
}
function pushWord() {
    if ( !key || parsingBlackList.indexOf( key ) > -1 ) {
        return;
    }
    pushDefinition();
    newWord.note = toMarkdown(boldFirstLine(makeLists(note)));
    if ( key !== newWord.key ) {
        throw `Problem with key ${newWord.key} !== ${key}`;
    }
    if ( newWord.char && vocabIndex[newWord.key] !== newWord.char ) {
        //console.log(`${newWord.char} has wrong key! (${newWord.key})`);
        fixKeyInWord(newWord);
    }
    words[newWord.key.trim()] = newWord;
    reset();
}

function removeBrackets(text) {
    return text.replace(/[\(\)]/g, '')
}

function extractFromHeading(line) {
    const split = line.split( ' ' ).filter((c) => c);
    const traditional = split.length === 3 ? removeBrackets(split[1]) : undefined
    // if 3 parts exactly probably have a line like 
    const pin = split.length === 3 ? split[2] : split[1];
    const char = split[0];
    // replace any brackets you found
    const pinyin = pin ? removeBrackets(pin) : undefined;
    const note = line.split( '–' ).slice( 1 ).join().trim();
    return {
        pinyin, note, char, traditional
    }
}

function shouldIgnoreLine(line) {
    // 3.18 口 Mouth-unit of ; 3.19 门 A form of ; 4.12 片 Piece of ;
    // 10.07 通 Contact-unit of ; 12.07 遍 Span of
    if ( !line.match(/\|/) ) {
        return true;
    } else if ( line.match(/^[0-9]+.*\;/) ) {
        return true;
    // 11.12	得 dé / de		050 (toc)
    } else if ( line.match(/^[0-9]+\.[0-9]+[\t ]*.*[0-9]+$/) ) {
        return true;
    } else {
        return false;
    }
}

function extractDefinitions( line ) {
    // look for definition start
    const match = /^[0-9]+\.\w*(.*)/.exec( line );
    if ( line.trim().length === 0 ) {
        return;
    } else if ( !def || match ) {
        pushDefinition();
        def = {
            heading: line,
            text: []
        };
    } else if ( def && def.text ) {
        def.text.push( line )
    } else {
        // a definition without heading
        def = {
            text: [ line ]
        }
    }
    return def;
}

function extract(filename) {
    key = null;
    console.log(`Extracting from ${filename}`);
    let file;
    try {
        file = fs.readFileSync(filename, 'UTF-16LE');
    } catch ( e ) {
        return;
    }
    file.toString().split(/[\r\n]/).map(line=>line.trim()).forEach((line) => {
        const matchNewWord = /^([0-9]+\.[0-9]+)/.exec( line );
        if ( matchNewWord && !shouldIgnoreLine( line ) ) {
            // Store the last found word as we've found a new one.
            if ( newWord ) {
                pushWord();
            }
            const parts = line.split( '|' );
            key = parts[0].trim();
            if ( parts.length && parts[1] ) {
                newWord = {
                    key,
                    definitions: [],
                    usage: parts[1].match(/[\+]+/g)[0].length,
                    text: ''
                };
            }
            i = 0;
            note = '';
            parsingPersonalNote = false;
        } else if ( key ) {
            // Extract word and sound
            if ( !newWord.char ) {
                Object.assign( newWord, extractFromHeading( line ) );
            } else {
                if ( line.toLowerCase().match( /(good-to-know information|good-to-know phrases|similar sounding\/looking|compounds formed with other|personal note:|useful term|similar characters:|names to note:)/ ) ) {
                    // start personal note
                    parsingPersonalNote = true;
                    note += '\n\n### ' + line + '\n';
                } else if ( parsingPersonalNote ) {
                    note += line + '\n';
                } else {
                    extractDefinitions( line );
                }
            }
        } else {
            // (ignore)
        }
        i++;
    });
    pushWord();
}

function parse() {
    extract('Vocabs_123A.txt');
    for ( let i = 4; i < 13; i++) {
        extract(`Vocabs_${i}.txt`);
    }
    Object.keys(words).sort((a,b) => parseFloat(a) < parseFloat(b) ? -1 : 1).forEach((w) => {
        if ( !w.match(/^[0-9]+\.[0-9]+$/ ) ) {
            throw 'problem with ' + w;
        }
    })
    fs.writeFileSync('slug.json', JSON.stringify( words ), 'utf8' )
}

module.exports = { extractFromHeading, extractDefinitions, makeLists,
    markReferenceLinks, boldFirstLine, parse, vocabIndex,
    reset, toMarkdown };
