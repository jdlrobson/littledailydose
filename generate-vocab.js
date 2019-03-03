const hogan = require( 'hogan.js' );
const fs = require( 'fs' );
const { markReferenceLinks } = require( './parse-vocab-text' );
const template = hogan.compile(
    fs.readFileSync( 'template.hogan' ).toString()
);
const slug = JSON.parse( fs.readFileSync( 'slug.json' ) );
const marked = require('marked');

const difficulty = {
    '2.01': 3
};
const references = {"4.01":"水","3.02":"小","6.01":"向","5.01":"宁","6.02":"地","6.03":"自","3.16":"己","5.02":"立","6.04":"她","2.03":"了","3.12":"下","6.05":"那","5.03":"外","5.04":"丝","6.06":"有","6.07":"冲","5.05":"平","6.08":"因","4.02":"为","4.03":"太","6.09":"好","4.04":"以","4.05":"长","4.06":"不","5.06":"东","6.10":"西","6.11":"回","5.07":"包","6.12":"多","3.01":"子","6.13":"曲","4.07":"历","6.14":"尽","3.05":"千","3.07":"也","4.08":"心","5.08":"甘","6.15":"再","6.16":"过","3.13":"久","6.17":"成","4.09":"从","6.18":"此","5.09":"世","1.01":"一","5.10":"叶","4.10":"木","6.19":"先","5.11":"生","6.20":"问","5.12":"他","5.13":"们","6.21":"在","3.14":"之","4.11":"天","4.12":"片","3.03":"上","4.13":"无","4.14":"比","6.22":"后","6.23":"老","6.24":"托","4.15":"风","6.25":"传","4.16":"方","4.17":"巨","3.15":"大","3.10":"干","4.18":"月","6.26":"光","5.14":"未","3.09":"么","6.27":"名","5.15":"发","4.19":"云","6.28":"朵","6.29":"当","6.30":"次","4.20":"见","5.16":"失","2.01":"二","3.04":"已","2.02":"人","3.06":"丈","2.04":"几","3.08":"个","3.11":"才","2.05":"又","3.18":"口","3.19":"门","3.20":"工","8.01":"鱼","9.01":"看","8.02":"所","8.03":"和","9.02":"显","8.04":"变","9.03":"亮","7.01":"丽","8.05":"的","7.02":"身","9.04":"诱","8.06":"表","9.05":"虽","7.03":"但","7.04":"还","9.06":"是","9.07":"觉","9.08":"点","7.05":"冷","9.09":"洗","8.07":"泡","9.10":"很","8.08":"饱","7.06":"饭","7.07":"忘","8.09":"抱","7.08":"我","9.11":"相","7.09":"层","7.10":"没","8.10":"到","9.12":"将","8.11":"拥","7.11":"怀","7.12":"里","7.13":"这","7.14":"时","7.15":"足","7.16":"矣","11.01":"堂","11.02":"域","3.17":"女","11.03":"混","12.01":"温","10.01":"浪","10.02":"浴","11.04":"唯","10.03":"桑","10.04":"拿","10.05":"特","12.02":"期","12.03":"就","10.06":"旅","12.04":"游","10.07":"通","10.08":"部","11.05":"常","12.05":"然","10.09":"离","11.06":"眼","10.10":"被","11.07":"移","11.08":"理","10.11":"调","10.12":"换","12.06":"最","12.07":"遍","10.13 ":"能","12.08":"等","11.09":"率","12.09":"道","11.10":"排","11.11":"第","11.12":"偶","12.10":"遇","11.13":"得","11.14":"脸","12.11":"提","11.15":"盖","10.14":"流","11.16":"着","10.02 ":"浴","11.17":"随","12.12":"程","11.18":"捺","11.19":"情","11.20":"假","11.21":"断","12.13":"落","10.15":"真"};

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
            const m = line.match(/# (.*) (.*)/ );
            if ( m ) {
                if ( m[1].indexOf( '(' ) > -1) {
                    // traditional
                    const m2 = m[1].match(/(.*) \((.*)\)/);
                    obj.char = m2[1];
                    obj.traditional = m2[2];
                } else {
                    obj.char = m[1];
                }
                obj.pinyin = m[2];
            }
        } else {
            const m = line.match(/\#+ (.*)/);
            const heading = m && m[1];
            if ( heading ) {
                isParsingPersonalNote = line.toUpperCase().trim() === '### PERSONAL NOTE';
                if ( !isParsingPersonalNote ) {
                    obj.definitions.push( { heading, text: '' } );
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

Object.keys( references ).forEach( ref => {
    const vocabEntry = getMarkdown( ref );
    if ( vocabEntry ) {
        const usage = Array.from(Array(difficulty[ref]).keys()).fill('+').join('');
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
            return {
                heading: headingRef[0],
                reference,
                text: marked(text)
            };
        });
        fs.writeFile(
            `public/${ref.replace('.', '-')}.txt`,
            `Usage: ${usage}
# ${char}${traditional ? ` (${traditional})` : ''} ${pinyin}
${vocabEntry.definitions.map(defToMarkdown).join('\n')}

### PERSONAL NOTE
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
    } else {
        console.log( 'could not locate', ref );
    }
} );
