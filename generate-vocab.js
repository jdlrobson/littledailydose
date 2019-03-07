const hogan = require( 'hogan.js' );
const fs = require( 'fs' );
const { markReferenceLinks, vocabIndex, lookupKey } = require( './parse-vocab-text' );
const template = hogan.compile(
    fs.readFileSync( 'template.hogan' ).toString()
);
const slug = JSON.parse( fs.readFileSync( 'slug.json' ) );
const marked = require('marked');

const references = vocabIndex;

const markdownToObj = (text) => {
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
            if ( headingText ) {
                const m = headingText[1].split( ' ' );
                if ( m[1].indexOf( '(' ) > -1) {
                    // traditional
                    obj.traditional = m[1].replace(/[\(\)]/g, '');
                    obj.pinyin = m[2];
                } else {
                    obj.pinyin = m[1];
                }
                obj.char = m[0];
                if ( m[3] ) {
                    // e.g. 风 (風) fēng – Not to be confused with 凤 (fèng)
                    obj.charReference = m.slice( 3 ).join( ' ' ).replace( /–/g, '').trim();
                }
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
    return markdownToObj(file.toString());
};

const defToMarkdown = ( { heading, text } ) =>
    `## ${heading}
${text}`;

function checkBrokenLinks( headingRef, text ) {
    const re = /\[([0-9]+\.[0-9]+) ([^\]]+)]\([0-9]*-[0-9]*\.html\)/g;
    let match;
    while ( match = re.exec(text) ) {
        const ref = match[1];
        const char = match[2];
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
    }
    const reLinkNotLabel = /\[([0-9]+)\.([0-9]+) [^\]]*\]\(([0-9]+)\-([0-9]+)\.html\)/g
    while ( match = reLinkNotLabel.exec(text) ) {
        if ( match[1] !== match[3] || match[2] !== match[4] ) {
            console.warn( `\t\t\t Found link that doesn't match label in ${headingRef}: ${match[0]}` );
        }
    }
}

Object.keys( references ).forEach( ref => {
    const vocabEntry = getMarkdown( ref );
    if ( vocabEntry ) {
        const usage = Array.from(Array(vocabEntry.difficulty).keys()).fill('+').join('');
        const char = vocabEntry.char;
        const traditional = vocabEntry.traditional;
        const pinyin = vocabEntry.pinyin;
        const definitions = vocabEntry.definitions.map( ( { heading, text } ) => {
            const headingRef = heading.split( /[一–]/ );
            const reference = headingRef[1] && marked(
                markReferenceLinks(
                    headingRef[1].replace(/-一/g, '').trim()
                )
            ).replace('<p>','').replace('</p>', ''); // hack
            checkBrokenLinks(ref, text);
            return {
                heading: headingRef[0],
                reference,
                text: marked(text)
            };
        });
        checkBrokenLinks(vocabEntry.note);
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
                source: vocabEntry.source,
                ref,
                strokes: parseInt( ref.split( '.' )[0], 10 ),
                charReference: vocabEntry.charReference,
                definitions,
                // requires formatting!
                personalNote: marked(vocabEntry.note),
                char,
                traditional,
                pinyin,
                // Not working (parsing incorrectly)
                difficulty: usage
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
        fs.writeFile(
            `public/toc.html`,
            template.render( {
                char: 'Table of contents',
                definitions: [],
                personalNote: marked(
                    Object.keys(references).sort((a,b) => parseFloat(a) < parseFloat(b) ? -1 : 1).map((key) =>
                        `* [${key} ${references[key]}](${key.replace('.', '-')}.html)` ).join('\n')
                    )
            }), {}
        );
    } else {
        console.log( 'could not locate', ref );
    }
} );
