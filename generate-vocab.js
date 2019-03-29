const hogan = require( 'hogan.js' );
const fs = require( 'fs' );
const { markReferenceLinks, vocabIndex, lookupKey } = require( './parse-vocab-text' );
const template = hogan.compile(
    fs.readFileSync( 'template.hogan' ).toString()
);
const slug = JSON.parse( fs.readFileSync( 'slug.json' ) );
const marked = require('marked');

const references = vocabIndex;

const charToPinyin = {};

const markdownToObj = (text, ref) => {
    const obj = {
        source: 'wiki',
        definitions: []
    };
    let isParsingPersonalNote = false;
    let personalNote = '';
    text.split( '\n' ).forEach((line, i) => {
        if ( i === 0 ) {
            const m = line.match(/Usage: (.+)/);
            obj.difficulty = m[1].length;
        } else if ( i === 1 ) {
            const headingText = line.match(/# (.*)/ );
            let pinyinPlusReference;
            if ( headingText ) {
                const m = headingText[1].split( ' ' );
                if ( m[1].indexOf( '(' ) > -1) {
                    // traditional
                    obj.traditional = m[1].replace(/[\(\)]/g, '');
                    pinyinPlusReference = m.slice(2).join(' ').split(/[–-]/);
                } else {
                    pinyinPlusReference = m.slice(1).join(' ').split(/[–-]/);
                }
                obj.char = m[0];
                obj.pinyin = pinyinPlusReference[0].split('·');
                obj.charReference = pinyinPlusReference.slice(1).join('-');
            }
        } else {
            const m = line.match(/\#+ (.*)/);
            const heading = m && m[1];
            if ( heading ) {
                isParsingPersonalNote = line.indexOf( '### ' ) > -1;
                if ( !isParsingPersonalNote ) {
                    obj.definitions.push( { heading, text: '' } );
                } else {
                    personalNote += line + '\n';
                }
            } else {
                if ( isParsingPersonalNote ) {
                    personalNote += line + '\n';
                } else {
                    obj.definitions[obj.definitions.length - 1].text += line + '\n';
                }
            }
        }
    });
    obj.note = personalNote;
    return obj;
}
const getMarkdown = (ref) => {
    let file;
    try {
        file = fs.readFileSync(`littledailydose.wiki/${ref.replace('.', '-')}.html.md`);
    } catch ( e ) {
        return slug[ref] ? Object.assign( slug[ref], { source: 'slug' } ) : false;
    }
    return markdownToObj(file.toString(), ref);
};

const defToMarkdown = ( { heading, text } ) =>
    `## ${heading}
${text}`;

function checkBrokenLinks( headingRef, text ) {
    const re = /\[([0-9]+\.[0-9]+) ([^\]]+)]\([0-9]*-[0-9]*\.html\)/g;
    let match;
    while ( match = re.exec(text) ) {
        const ref = match[1];
        const char = match[2].replace( /<sup>.*<\/sup>/g, '' );
        const validChar = vocabIndex[ref];
        if ( validChar !== char ) {
            console.warn( `\t\t\t Possible invalid link in ${headingRef} (${match[0]}). Should be ${lookupKey(char)}` );
        }
    }
    const reNoCharacter = /\[([0-9]+\.[0-9]+)\]\(/g
    while ( match = reNoCharacter.exec(text) ) {
        const ref = match[1];
        const char = vocabIndex[ref];
        console.warn( `\t\t\t link found in ${headingRef} without character. [${match[1]}] should be [${match[1]} ${char}]` );
        throw new Error();
    }
    const reLinkNotLabel = /\[([0-9]+)\.([0-9]+) [^\]]*\]\(([0-9]+)\-([0-9]+)\.html\)/g
    while ( match = reLinkNotLabel.exec(text) ) {
        if ( match[1] !== match[3] || match[2] !== match[4] ) {
            console.warn( `\t\t\t Found link that doesn't match label in ${headingRef}: ${match[0]}` );
            throw new Error();
        }
    }
}

const index = [];

function innerHTML( htmlSingleNode ) {
    return htmlSingleNode.replace('<p>','').replace('</p>', ''); // hack
}

// generate pages
function generatePage( ref ) {
    const vocabEntry = getMarkdown( ref );
    if ( vocabEntry ) {
        const usage = Array.from(Array(vocabEntry.difficulty).keys()).fill('+').join('');
        const char = vocabEntry.char;
        const traditional = vocabEntry.traditional;
        const pinyin = vocabEntry.pinyin;
        // record this for later lookup
        charToPinyin[char] = pinyin;
        const definitions = vocabEntry.definitions.map( ( { heading, text } ) => {
            const headingRef = heading.split( /[一–]/ );
            const reference = headingRef[1] && innerHTML( marked(
                markReferenceLinks(
                    headingRef[1].replace(/-一/g, '').trim()
                )
            ) );
            checkBrokenLinks(ref, text);
            return {
                heading: headingRef[0],
                reference,
                anchor: heading.replace( /	/g, '' )
                    .replace( /  /g, ' ' )
                    .replace( '.', ' ' )
                    .replace( / /g, '-' )
                    .toLowerCase(),
                text: marked(text)
            };
        });
        checkBrokenLinks(ref, vocabEntry.note);
        index.push(
            [ ref, char, pinyin ]
                .concat( definitions.map( ( { heading } ) => heading ) )
        );
        fs.writeFile(
            `public/${ref.replace('.', '-')}.txt`,
            `Usage: ${usage}
# ${char}${traditional ? ` (${traditional})` : ''} ${pinyin}
${vocabEntry.definitions.map(defToMarkdown).join('\n')}

${vocabEntry.note}`,
            {
                encoding: 'utf8'
            }
        );
        fs.writeFile(
            `public/${ref.replace('.', '-')}.html`,
            template.render( {
                title: `${char} (${pinyin})`,
                isVocabPage: true,
                source: vocabEntry.source,
                ref,
                strokes: parseInt( ref.split( '.' )[0], 10 ),
                charReference: vocabEntry.charReference ?
                    innerHTML( marked(vocabEntry.charReference) ) : '',
                definitions,
                // requires formatting!
                personalNote: marked(vocabEntry.note),
                char,
                traditional,
                pinyin,
                // Not working (parsing incorrectly)
                difficulty: usage,
                difficultyLength: usage.length
            } ),
            {
                encoding: 'utf8'
            },
            ( err ) => {
                if ( err ) {
                    console.log(`error writing ${ref}`, err )
                }
            }
        );
    } else {
        console.log( 'could not locate', ref );
    }
}

function generateToc() {
    const sortedKeys = Object.keys(references).sort((a,b) => parseFloat(a) < parseFloat(b) ? -1 : 1);
    const keyToLink = (key) => {
        const char = references[key];
        const pinyin = charToPinyin[char];
        if ( !pinyin ) {
            throw new Error( `problem in ${key}` );
        }
        return `* [${key} ${char} ${pinyin.join('·')}](${key.replace('.', '-')}.html)`;
    };
    const filterByStroke = ( stroke ) => {
        return ( key ) => {
            return key.split('.')[0] === stroke;
        };
    }
    const strokesToc = ( stroke ) => {
        const strokes = stroke === '1' ? 'stroke' : 'strokes';
        return `<section id="chinese-characters-with-${stroke}-${strokes}">
<h2><span>Chinese characters with <strong>${stroke} ${strokes}</strong></span></h2>
${marked(sortedKeys.filter(filterByStroke( stroke )).map(keyToLink).join( '\n' ))}
</section>`;
    };

    fs.writeFile(
        `public/toc.html`,
        template.render( {
            isVocabPage: true,
            title: 'Table of Vocabularies',
            strokes: 'toc',
            definitions: [],
            personalNote: `<div class="toc">
${strokesToc('1')}
${strokesToc('2')}
${strokesToc('3')}
${strokesToc('4')}
${strokesToc('5')}
${strokesToc('6')}
${strokesToc('7')}
${strokesToc('8')}
${strokesToc('9')}
${strokesToc('10')}
${strokesToc('11')}
${strokesToc('12')}
</div>`
            } ),
            { encoding: 'utf8' }
        );
}
function generateIndex() {
        // make index.json
        fs.writeFile(
            `public/index.json`,
            JSON.stringify(index ),
            {
                encoding: 'utf8'
            }
        );
}
function generateAboutUs() {
    // make index.json
    fs.writeFile(
        `public/about.html`,
        template.render( {
            isAboutUsPage: true,
            title: 'About us',
            strokes: 'about',
            definitions: [],
            personalNote: marked('# About us\n' + fs.readFileSync(`littledailydose.wiki/About-us.md`).toString())
        } ),
        {
            encoding: 'utf8'
        }
    );
}

if ( process.argv[2] ) {
    generatePage( process.argv[2] );
} else {
    Object.keys( references ).forEach( ref => generatePage( ref ) );
    generateToc();
    generateIndex();
    generateAboutUs();
}

