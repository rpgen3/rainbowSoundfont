(async () => {
    const {importAll, getScript} = await import(`https://rpgen3.github.io/mylib/export/import.mjs`);
    await Promise.all([
        'https://code.jquery.com/jquery-3.3.1.min.js',
        'https://colxi.info/midi-parser-js/src/main.js'
    ].map(getScript));
    const {$, MidiParser} = window;
    const html = $('body').empty().css({
        'text-align': 'center',
        padding: '1em',
        'user-select': 'none'
    });
    const head = $('<header>').appendTo(html),
          main = $('<main>').appendTo(html),
          foot = $('<footer>').appendTo(html);
    $('<h1>').appendTo(head).text('レ淫棒サウンドフォント2017を使う');
    $('<h2>').appendTo(head).text('レ淫棒サウンドフォント2017を使う');
    const rpgen3 = await importAll([
        'input',
        'css',
        'util',
        'save'
    ].map(v => `https://rpgen3.github.io/mylib/export/${v}.mjs`));
    const rpgen4 = await importAll([
        'https://rpgen3.github.io/maze/mjs/heap/Heap.mjs',
        'https://rpgen3.github.io/nsx39/mjs/midiOutput/MidiOutput.mjs',
        'https://rpgen3.github.io/rainbowSoundfont/mjs/fetchRainbowSoundFont.mjs',
        [
            'MidiNote',
            'MidiNoteMessage',
            'MidiTempoMessage',
            'TrackNameMap',
        ].map(v => `https://rpgen3.github.io/piano/mjs/midi/${v}.mjs`),
        [
            'midiScheduler'
        ].map(v => `https://rpgen3.github.io/mergedMidiOutput/mjs/${v}.mjs`)
    ].flat());
    Promise.all([
        'container',
        'tab',
        'img',
        'btn'
    ].map(v => `https://rpgen3.github.io/spatialFilter/css/${v}.css`).map(rpgen3.addCSS));
    const hideTime = 500;
    const addHideArea = (label, parentNode = main) => {
        const html = $('<div>').addClass('container').appendTo(parentNode);
        const input = rpgen3.addInputBool(html, {
            label,
            save: true,
            value: true
        });
        const area = $('<dl>').appendTo(html);
        input.elm.on('change', () => input() ? area.show(hideTime) : area.hide(hideTime)).trigger('change');
        return Object.assign(input, {
            get html(){
                return area;
            }
        });
    };
    const addLabeledText = (html, {label, value}) => {
        const holder = $('<dd>').appendTo(html);
        $('<span>').appendTo(holder).text(label);
        const content = $('<span>').appendTo(holder).text(value);
        return value => content.text(value);
    };
    {
        const {html} = addHideArea('init');
        const viewStatus = addLabeledText(html, {
            label: '状態：',
            value: '未接続'
        });
        rpgen3.addBtn(html, 'MIDI出力デバイスに接続', async () => {
            try {
                const midiOutputs = await rpgen4.MidiOutput.fetchMidiOutputs();
                selectMidiOutput.update([...midiOutputs].map(([_, v]) => [v.name, v]));
                selectMidiOutput.elm.trigger('change');
                viewStatus('接続成功');
            } catch (err) {
                console.error(err);
                viewStatus('接続失敗');
            }
        }).addClass('btn');
        const selectMidiOutput = rpgen3.addSelect(html, {
            label: 'MIDI出力デバイスを選択'
        });
        selectMidiOutput.elm.on('change', () => {
            rpgen4.midiScheduler.midiOutput = new rpgen4.MidiOutput(selectMidiOutput());
        });
        const selectMidiChannel = rpgen3.addSelect(html, {
            label: '出力先のチャンネルを選択',
            save: true,
            list: [
                ['全てのチャンネル', null],
                ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(v => [`Ch.${v}`, v - 1])
            ]
        });
        $('<dd>').appendTo(html);
        rpgen3.addBtn(html, '出力テスト(C5)', () => {
            try {
                const channel = selectMidiChannel();
                rpgen4.midiScheduler.midiOutput.noteOn({
                    data: {channel, pitch: 0x48, velocity: 100}
                });
                rpgen4.midiScheduler.midiOutput.noteOn({
                    data: {channel, pitch: 0x48, velocity: 0},
                    timestamp: performance.now() + 500
                });
            } catch (err) {
                console.error(err);
                alert(err);
            }
        }).addClass('btn');
    }
    let g_midi = null;
    let g_midi_file_name = null;
    {
        const {html} = addHideArea('input MIDI file');
        const viewStatus = addLabeledText(html, {
            label: 'MIDIファイル：',
            value: '入力したファイル名'
        });
        const inputFile = $('<input>').appendTo($('<dd>').appendTo(html)).prop({
            type: 'file',
            accept: '.mid'
        }).on('change', async ({target}) => {
            const file = target.files.item(0);
            viewStatus(file?.name);
            if (file?.name) {
                g_midi_file_name = file.name;
            }
        });
        MidiParser.parse(inputFile.get(0), v => {
            g_midi = v;
            loadSelectPrograms();
        });
    }
    {
        const {html} = addHideArea('settings');
        const inputSpeedRate = rpgen3.addSelect(html, {
            label: '演奏速度',
            save: true,
            list: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(v => [`x${v}`, v]),
            value: 'x1'
        });
        inputSpeedRate.elm.on('change', () => {
            rpgen4.midiScheduler.speedRate = inputSpeedRate();
        }).trigger('change');
        const inputScheduledTime = rpgen3.addSelect(html, {
            label: 'スケジューリング[ミリ秒]',
            save: true,
            list: [
                ...[...Array(10).keys()].map(v => v * 100),
                ...[...Array(5).keys()].map(v => v * 1000)
            ],
            value: 100
        });
        inputScheduledTime.elm.on('change', () => {
            rpgen4.midiScheduler.scheduledTime = inputScheduledTime();
        }).trigger('change');
        const inputShiftedNoteOffTime = rpgen3.addSelect(html, {
            label: 'ノートオフを先行させる[デルタ時間]',
            save: true,
            list: [...Array(10).keys()],
            value: 1
        });
        inputShiftedNoteOffTime.elm.on('change', () => {
            rpgen4.midiScheduler.shiftedNoteOffTime = inputShiftedNoteOffTime();
        }).trigger('change');
    }
    {
        const {html} = addHideArea('playing');
        const scheduledToEnd = addLabeledText(html, {
            label: '終了予定：',
            value: '未定'
        });
        rpgen3.addBtn(html, '演奏データの作成', () => {
            try {
                rpgen4.midiScheduler.load(makeMessageArrays());
            } catch (err) {
                console.error(err);
                alert(err);
            }
        }).addClass('btn');
        rpgen3.addBtn(html, '演奏中止', async () => {
            await rpgen4.midiScheduler.stop();
            scheduledToEnd('中止');
        }).addClass('btn');
        rpgen3.addBtn(html, '演奏開始', async () => {
            await rpgen4.midiScheduler.play();
            scheduledToEnd(new Date(Date.now() + rpgen4.midiScheduler.scheduledTime + rpgen4.midiScheduler.duration).toTimeString());
            programChangeAll();
        }).addClass('btn');
    }
    let loadSelectPrograms = null;
    let programChangeAll = null;
    {
        const {html} = addHideArea('Program Change');
        $(html).text('とくにありません');
        const {instrumentList, drumSetList} = await rpgen4.fetchRainbowSoundFont();
        const lists = Array(0x10).fill(instrumentList.map(v => [v.Name, v.children.map(v => [v.Name, v])]));
        lists[0x09] = [['ドラム', drumSetList.map(v => [v.Name, v])]];
        let selectPrograms = null;
        loadSelectPrograms = () => {
            html.empty();
            const trackNameMap = new rpgen4.TrackNameMap(g_midi);
            selectPrograms = [...Array(0x10).keys()].map(i => rpgen3.addGroupedSelect(html, {
                prefix: g_midi_file_name,
                label: [`Ch.${i + 1}`, trackNameMap.get(i)].filter(v => v).join(' '),
                list: lists[i],
                save: true
            }));
            for (const [channel, selectProgram] of selectPrograms.entries()) {
                selectProgram.elm.on('change', () => {
                    programChange(channel);
                });
            }
        };
        const programChange = channel => {
            const {PC, LSB, MSB} = selectPrograms[channel]();
            rpgen4.midiScheduler.midiOutput.controlChange({data: {channel, control: 0x00, value: MSB}});
            rpgen4.midiScheduler.midiOutput.controlChange({data: {channel, control: 0x20, value: LSB}});
            rpgen4.midiScheduler.midiOutput.programChange({data: {channel, program: PC}});
        };
        programChangeAll = () => selectPrograms.forEach((_, i) => programChange(i));
    }
    const makeMessageArrays = () => {
        const midiNoteArray = rpgen4.MidiNote.makeArray(g_midi);
        return {
            midiNotes: rpgen4.MidiNoteMessage.makeArray(midiNoteArray),
            tempos: rpgen4.MidiTempoMessage.makeArray(g_midi)
        };
    };
})();
