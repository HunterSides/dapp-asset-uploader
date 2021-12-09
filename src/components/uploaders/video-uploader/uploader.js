import { alert } from 'ui/components';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { directive, dom, emitter, node } from 'ui/lib';
import { storage, user } from 'dapp';
import upload from './upload';


let button,
    ffmpeg,
    id,
    processing = false;


async function save(data) {
    let { video, banner, description, encrypt, keywords, name, thumbnail, transcode, unlisted } = data,
        doc = { description, ipfs: { video, banner, thumbnail }, keywords, name };

    for (let key in doc) {
        if (key === 'ipfs') {
            for (let k in doc.ipfs) {
                if (!doc.ipfs[k]) {
                    delete doc.ipfs[k];
                    continue;
                }

                let file = doc.ipfs[k];

                if (transcode && k === 'video') {
                    let files = [];

                    if (!ffmpeg) {
                        ffmpeg = createFFmpeg({ log: true });
                    }

                    if (!ffmpeg.isLoaded()) {
                        await ffmpeg.load();
                    }

                    ffmpeg.FS('writeFile', file.name, await fetchFile(file));

                    await ffmpeg.run('-i', file.name, '-strict', '-2', '-profile:v', 'baseline', '-level', '3.0', '-start_number', '0', '-hls_list_size', '0', '-hls_segment_filename', 'segment%03d.ts', '-f', 'hls', 'segments.m3u8');

                    files.push({
                        content: ffmpeg.FS('readFile', 'segments.m3u8'),
                        path: 'segments.m3u8'
                    });

                    let i = '000',
                        segment;

                    function read(i) {
                        try {
                            return ffmpeg.FS('readFile', `segment${i}.ts`);
                        }
                        catch {}

                        return false;
                    }

                    while (segment = read(i)) {
                        files.push({
                            content: segment,
                            path: `segment${i}.ts`
                        });

                        i++;

                        if (i < 10) {
                            i = `00${i}`;
                        }
                        else if (i < 100) {
                            i = `0${i}`;
                        }
                    }

                    doc.ipfs[k] = await storage.ipfs.upload.files(files);

                    console.log({
                        message: 'Transcoding successful',
                        ipfs: doc.ipfs[k]
                    });
                }
                // Encrypt File
                else if (encrypt || unlisted) {
                    let encrypted = await user.message.encrypt(await file.text());

                    doc.ipfs[k] = await storage.ipfs.upload.file(encrypted);
                }
                else {
                    doc.ipfs[k] = await storage.ipfs.upload.file(file);
                }

                // Encrypt IPFS Pins
                if (unlisted) {
                    doc.ipfs[k] = await user.message.encrypt(doc.ipfs[k]);
                }
            }
        }
        else {
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
    }

    doc.encrypted = encrypt == true;
    doc.transcoded = transcode == true;
    doc.unlisted = unlisted == true;

    if (id) {
        doc.id = id;
    }

    let document = await upload.video.save([doc]);

    console.log(document);

    alert.success('Dash Document saved successfully! Check console for output');

    button.classList.remove('button--processing');
    processing = false;
}


const metadata = async function(e) {
    let data = dom.element('video');

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
        else if (['encrypt', 'transcode', 'unlisted'].includes(key)) {
            data[key] = data[key].checked;
        }
        else if (['video', 'banner', 'thumbnail'].includes(key)) {
            data[key] = data[key].files[0] || '';
        }
        else {
            data[key] = data[key].value || '';
        }
    }

    if (!data.video) {
        alert.error('You must upload a video file to continue.');
    }
    else if (!data.name) {
        alert.error('Name field is required');
    }
    else {
        button = this.element;

        button.classList.add('button--processing');
        processing = true;
        save(data);
    }
};

const video = async function (e) {
    e.preventDefault();
    e.stopPropagation();

    this.element.labels[0].classList.add('--hidden');
    this.refs.metadata.classList.remove('--hidden');
};

const images = async function (e) {
    e.preventDefault();
    e.stopPropagation();

    let text = this.refs.text;

    if (!text) {
        return;
    }

    dom.update(() => {
        node.text(text, this.element.files[0].name);
    });
};

const reset = function (e) {
    this.value = '';
};


directive.on('upload.video', video);
directive.on('upload.banner', images);
directive.on('upload.thumbnail', images);
directive.on('upload.reset', reset);
directive.on('upload.metadata', metadata);
