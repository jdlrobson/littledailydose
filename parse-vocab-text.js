const fs = require('fs');
const words = {};

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
    return text.replace( /^([^\!\n]+[!]?) */, withThis + '$1' + withThis + ' ' );
}
function boldFirstLine(text) {
    return wrapFirstLine(text, '**');
}

function markReferenceLinks(text) {
    return text.replace(/([0-9])+\.([0-9]+) ([\u4E00-\u9FCC]+)/g, '[$1.$2 $3]($1-$2.html)');
}

function makeLists(text) {
    return text.replace(/\u0003/g, '\n' ).split( '\n' ).map((line, i) => {
        const isListHeader = line.match(/: *$/);
        const re = /^([\u4E00-\u9FCC]+ .*$)/;
        if ( isListHeader ) {
            return '\n**' + line.replace( /: *$/, ':' ) + '**';
        } else {
            return line.match(re) ? line.replace(re, '- $1') :
            (line === '' ? line : '\n' + line );
        }
        } ).join('\n');
}

function toMarkdown(text) {
    return markReferenceLinks( text.replace( /[<>]/g, '*' ) );
}

function pushDefinition() {
    if ( def ) {
        const defBody = toMarkdown(def.text.join( '\n' ));
        def.text = beginsWithChineseChar(defBody) ? defBody : wrapFirstLine(defBody, '**');
        newWord.definitions.push( def );
        def = null;
    }
}

function pushWord() {
    pushDefinition();
    newWord.note = toMarkdown(boldFirstLine(makeLists(note)));
    if ( key !== newWord.key ) {
        throw `Problem with key ${newWord.key} !== ${key}`;
    }
    words[key] = newWord;
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
    if ( !def || match ) {
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
            if ( i === 1 ) {
                Object.assign( newWord, extractFromHeading( line ) );
            } else {
                if ( line.toLowerCase().match( 'personal note:' ) ) {
                    // start personal note
                    parsingPersonalNote = true;
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
    reset();
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
    markReferenceLinks, boldFirstLine, parse,
    reset, toMarkdown };
