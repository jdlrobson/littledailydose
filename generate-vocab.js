const hogan = require( 'hogan.js' );
const fs = require( 'fs' );
const { markReferenceLinks, vocabIndex, lookupKey } = require( './parse-vocab-text' );
const template = hogan.compile(
    fs.readFileSync( 'template.hogan' ).toString()
);
const slug = JSON.parse( fs.readFileSync( 'slug.json' ) );
const marked = require('marked');

const paypalForm = `<form class="paypal-form" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
<h2>Pre-order</h2>
<strong>USD: $28.80</strong>
<input type="hidden" name="cmd" value="_s-xclick">
<input type="hidden" name="hosted_button_id" value="ADGZNJEJ9GN4C">
<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_buynowCC_LG.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!">
<img alt="" border="0" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" width="1" height="1">
</form>`;

const references = vocabIndex;

const charToPinyin = {};

const parseDifficulty = ( line ) => {
    const m = line.match(/Usage: (.+)/);
    return m[1].length;
};

const parseHeadingLine = ( line ) => {
    const obj = {};
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
    return obj;
};

const parseDefinitionsFromLines = ( lines ) => {
    const obj = { definitions: [] };
    let personalNote = '';
    let isParsingPersonalNote = false;
    lines.forEach((line, i) => {
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
            if ( !line && obj.definitions.length === 0 ) {
                // ignore
            } else if ( isParsingPersonalNote ) {
                personalNote += line + '\n';
            } else {
                obj.definitions[obj.definitions.length - 1].text += line + '\n';
            }
        }
    } );
    obj.note = personalNote;
    return obj;
};

const parseVocabEntry = ( lines ) => {
    const obj = {
        source: 'wiki',
        entries: [],
        difficulty: parseDifficulty( lines[0] )
    };
    // the rest of the lines are definitions
    lines = lines.slice(1);

    // starting at the last line, work back...
    let lastIndex = 0;
    lines.reverse();
    lines.forEach( ( line, i ) => {
        // until you find a # signalling the first entry
        if ( line.indexOf( '# ' ) === 0 ) {
            const entry = parseHeadingLine( line );
            Object.assign( entry,
                parseDefinitionsFromLines(
                    lines.slice( lastIndex, i ).reverse()
                )
            );
            obj.entries.push( entry );
            lastIndex = i + 1;
        }
    } );
    // reverse the entries list since we parsed it backwards
    obj.entries.reverse();
    return obj;
};

const markdownToObj = ( text ) => {
    const lines = text.split( '\n' );
    return parseVocabEntry( lines );
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

function wikify( ref, vocabEntries ) {
    vocabEntries.entries = vocabEntries.entries.map( ( vocabEntry ) => {
        vocabEntry.definitions = vocabEntry.definitions.map( ( { heading, text } ) => {
            const splitRegEx = /[一–]/g;
            const headingRef = heading.split( splitRegEx );
            const reference = headingRef[1] && innerHTML( marked(
                markReferenceLinks(
                    headingRef[1].replace(splitRegEx, '').trim()
                )
            ) );
            // check if wiki heading is in an unexpected format
            if ( headingRef[0] && headingRef[0].indexOf( '.html' ) > -1 ) {
                throw new Error(`Problem with definition heading in ${ref}: ${heading}`);
            }
            checkBrokenLinks(ref, text);
            const newHeading = headingRef[0];
            return {
                heading: newHeading,
                reference,
                anchor: heading.replace( /	/g, '' )
                    .replace( /  /g, ' ' )
                    .replace( '.', ' ' )
                    .replace( / /g, '-' )
                    .toLowerCase(),
                text: marked(text)
            };
        });
        vocabEntry.personalNote = marked(vocabEntry.note);
        checkBrokenLinks(ref, vocabEntry.note);
        return vocabEntry;
    } );
    return vocabEntries;
}
// generate pages
function generatePage( ref ) {
    const vocabEntries = wikify( ref, getMarkdown( ref ) );
    const vocabEntry = vocabEntries && vocabEntries.entries[0];
    const definitions = vocabEntries.entries
        .map( ( entry ) => entry.definitions ).reduce(( prev = [], currentValue ) => {
            return prev.concat( currentValue );
        } );
    if ( vocabEntry ) {
        const usage = Array.from(Array(vocabEntries.difficulty).keys()).fill('+').join('');
        const char = vocabEntry.char;
        const traditional = vocabEntry.traditional;
        const pinyin = vocabEntry.pinyin;
        // record this for later lookup
        charToPinyin[char] = pinyin;
        index.push(
            [ traditional, ref, char  ].concat( pinyin )
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
                articlehtml: paypalForm,
                bodyClasses: 'body--entry',
                title: `${char} (${pinyin})`,
                isVocabPage: true,
                source: vocabEntry.source,
                ref,
                strokes: parseInt( ref.split( '.' )[0], 10 ),
                charReference: vocabEntry.charReference ?
                    innerHTML( marked(vocabEntry.charReference) ) : '',
                entries: vocabEntries.entries,
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
        `public/index.html`,
        template.render( {
            isVocabPage: true,
            articlehtml: paypalForm,
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
function generateContactUs() {
    // make index.json
    fs.writeFile(
        `public/contact.html`,
        template.render( {
            articlehtml: paypalForm,
            isContactUsPage: true,
            title: 'Contact us',
            strokes: 'contact',
            definitions: [],
            personalNote: marked('# Contact us\n' + fs.readFileSync(`littledailydose.wiki/Contact-us.md`).toString())
        } ),
        {
            encoding: 'utf8'
        }
    );
}

function generateBookPage() {
    const bookText = fs.readFileSync(`littledailydose.wiki/Book.md`).toString();
    const articlehtml = `<img class="bookcover" src="Header_1.jpg" width="2100" alt="A Little Daily Dose" />
    <section class="book-buy">
        ${marked( bookText )}
        ${paypalForm}
    </section>`
    // make index.html
    fs.writeFile(
        `public/about.html`,
        template.render( {
            articlehtml,
            isStoryPage: true,
            title: 'Buy the book',
            strokes: 'buy',
            definitions: [],
            personalNote: false
        } ),
        {
            encoding: 'utf8'
        }
    );
};

if ( process.argv[2] ) {
    generatePage( process.argv[2] );
} else {
    Object.keys( references ).forEach( ref => generatePage( ref ) );
    generateToc();
    generateIndex();
    generateContactUs();
    generateBookPage();
}

