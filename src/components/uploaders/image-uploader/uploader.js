import { alert } from 'ui/components';
import { directive, dom, emitter, node } from 'ui/lib';
import { storage, user } from 'dapp';
import Compressor from 'compressorjs';
import upload from './upload';


let button,
    id,
    processing = false;


async function uploadImage(compress, encrypt, file, unlisted) {
    let content = file;

    if (compress) {
        content = new Promise((resolve, reject) => {
            new Compressor(file, {
                quality: 0.8,
                success(result) {
                    resolve(result);
                }
            });
        });
        content = await content;
    }

    if (encrypt) {
        content = await user.message.encrypt(await file.text());
    }

    let cid = await storage.ipfs.upload.file(content);

    if (unlisted) {
        cid = await user.message.encrypt(cid);
    }

    return cid;
}


async function process(data) {
    let { compress, description, encrypt, gallery, image, keywords, name, unlisted } = data,
        doc = { description, keywords, ipfs: {}, name };

    for (let key in doc) {
        if (!doc[key]) {
            delete doc[key];
            continue;
        }

        if (unlisted) {
            if (key === 'keywords') {
                for (let i = 0, n = doc.keywords.length; i < n; i++) {
                    doc.keywords[i] = await user.message.encrypt(doc.keywords[i]);
                }
            }
            else {
                doc[key] = await user.message.encrypt(doc[key]);
            }
        }
    }

    doc.compressed = compress == true;
    doc.encrypted = encrypt == true;
    doc.unlisted = unlisted == true;

    if (id) {
        doc.id = id;
    }

    if (gallery) {
        doc.ipfs.gallery = [];

        for (let i = 0, n = gallery.length; i < n; i++) {
            doc.ipfs.gallery[i] = await uploadImage(compress, encrypt, gallery[i], unlisted);
        }
    }
    else if (image) {
        doc.ipfs.image = await uploadImage(compress, encrypt, image, unlisted);
    }

    let document = await upload.image.save([doc]);

    console.log(document);

    alert.success('Dash Document saved successfully! Check console for output');

    button.classList.remove('button--processing');
    processing = false;
}


const metadata = async function(e) {
    let data = dom.element('image');

    for (let key in data) {
        if (key === 'keywords') {
            let values = [];

            for (let k in data[key]) {
                if (!data[key][k].value) {
                    continue;
                }

                values.push(data[key][k].value);
            }

            data[key] = values;
        }
        else if (['compress', 'encrypt', 'unlisted'].includes(key)) {
            data[key] = data[key].checked;
        }
        else if (key === 'image') {
            let files = data.image.files;

            delete data.image;

            if (files.length === 1) {
                data.image = files[0];
            }
            else if (files.length > 1) {
                data.gallery = files;
            }
        }
        else {
            data[key] = data[key].value || '';
        }
    }

    if (!data.image && !data.gallery) {
        alert.error('You must upload image file(s) to continue.');
    }
    else {
        button = this.element;

        button.classList.add('button--processing');
        processing = true;
        process(data);
    }
};

const image = async function (e) {
    e.preventDefault();
    e.stopPropagation();

    this.element.labels[0].classList.add('--hidden');
    this.refs.metadata.classList.remove('--hidden');
};

const reset = function (e) {
    this.value = '';
};


directive.on('upload.image', image);
directive.on('upload.reset', reset);
directive.on('upload.metadata', metadata);
