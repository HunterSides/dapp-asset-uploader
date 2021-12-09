import { alert } from 'ui/components';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { directive, dom, emitter, node } from 'ui/lib';
import { storage, user } from 'dapp';
import upload from './upload';


let ffmpeg,
    id,
    processing = false;


async function save(data) {
    let { audio, banner, description, encrypt, keywords, name, thumbnail, transcode, unlisted } = data,
        doc = { description, ipfs: { audio, banner, thumbnail }, keywords, name };

    for (let key in doc) {
        if (key === 'ipfs') {
            for (let k in doc.ipfs) {
                if (!doc.ipfs[k]) {
                    delete doc.ipfs[k];
                    continue;
                }

                let file = doc.ipfs[k];

                if (transcode && k === 'audio') {
                    let files = [];

                    if (!ffmpeg) {
                        ffmpeg = createFFmpeg({ log: true });
                    }

                    if (!ffmpeg.isLoaded()) {
                        await ffmpeg.load();
                    }

                    ffmpeg.FS('writeFile', file.name, await fetchFile(file));

                    await ffmpeg.run('-y', '-i', file.name, '-c:a', 'libmp3lame', '-q:a', '0', '-map', '0:0', '-f', 'segment', '-segment_time', '10', '-segment_list', 'segments.m3u8', '-segment_format', 'mpegts', 'segment%03d.ts');

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

    console.log(doc);
    return;

    let document = await upload.audio.save([doc]);

    console.log(document);

    alert.success('Dash Document saved successfully! Check console for output');

    this.element.classList.remove('button--processing');
    processing = false;
}


const metadata = async function(e) {
    let data = dom.element('audio');

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
        else if (['audio', 'banner', 'thumbnail'].includes(key)) {
            data[key] = data[key].files[0] || '';
        }
        else {
            data[key] = data[key].value || '';
        }
    }

    if (!data.audio) {
        alert.error('You must upload an audio file to continue.');
    }
    else if (!data.name) {
        alert.error('Name field is required');
    }
    else {
        this.element.classList.add('button--processing');
        processing = true;
        save(data);
    }
};

const audio = async function (e) {
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


directive.on('upload.audio', audio);
directive.on('upload.banner', images);
directive.on('upload.thumbnail', images);
directive.on('upload.reset', reset);
directive.on('upload.metadata', metadata);
