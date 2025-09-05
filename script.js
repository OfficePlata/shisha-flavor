window.onload = function() {
    // --- 設定項目 ---
    const LIFF_ID = "2008056194-yBw4o4Qv"; // 3.で取得したLIFF IDに書き換える
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzIOvs-3IfIPUe1FEOXF__f_iMmdpDvzvYzMCX9Aq4xKQIySSAiyqUwHQ5hoYDawd57/exec"; // 2.で取得したGASのURLに書き換える
    const MAX_SELECT_COUNT = 2; // フレーバーを選択できる最大数
    // --------------

    let selectedFlavors = [];
    let userProfile = null; // ★ 変更点: ユーザー情報を保存する変数

    const loadingEl = document.getElementById('loading');
    const flavorGridEl = document.getElementById('flavor-grid');
    const orderButtonEl = document.getElementById('order-button');
    const selectedDisplayEl = document.getElementById('selected-flavors-display');

    // LIFFの初期化
    liff.init({ liffId: LIFF_ID })
        .then(() => {
            if (!liff.isLoggedIn()) {
                liff.login();
            } else {
                // ★ 変更点: ユーザー情報を取得してからフレーバーを読み込む
                liff.getProfile()
                    .then(profile => {
                        userProfile = profile;
                        fetchFlavors();
                    })
                    .catch(err => {
                        console.error('プロファイルの取得に失敗しました', err);
                        fetchFlavors(); // プロファイルが取得できなくても処理を続ける
                    });
            }
        })
        .catch((err) => {
            console.error(err);
            loadingEl.textContent = "LIFFアプリの初期化に失敗しました。";
        });

    // GASからフレーバーデータを取得して画面に表示
    async function fetchFlavors() {
        try {
            const response = await fetch(GAS_API_URL);
            if (!response.ok) throw new Error('APIからのデータ取得に失敗しました。');
            
            const flavors = await response.json();
            renderFlavors(flavors);

            loadingEl.classList.add('hidden');
            flavorGridEl.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            loadingEl.textContent = "フレーバー情報の読み込みに失敗しました。";
        }
    }

    // フレーバーの一覧を画面に描画
    function renderFlavors(flavors) {
        flavorGridEl.innerHTML = '';
        flavors.forEach(flavor => {
            const card = document.createElement('div');
            card.className = 'flavor-card';
            card.dataset.id = flavor.id;
            card.dataset.name = flavor.name;

            card.innerHTML = `
                <img src="${flavor.imageUrl}" alt="${flavor.name}">
                <h3>${flavor.name}</h3>
            `;
            
            card.addEventListener('click', () => handleFlavorSelect(card));
            flavorGridEl.appendChild(card);
        });
    }

    // フレーバー選択時の処理
    function handleFlavorSelect(card) {
        const flavorId = card.dataset.id;
        const flavorName = card.dataset.name;
        const isSelected = selectedFlavors.some(f => f.id === flavorId);

        if (isSelected) {
            card.classList.remove('selected');
            selectedFlavors = selectedFlavors.filter(f => f.id !== flavorId);
        } else {
            if (selectedFlavors.length < MAX_SELECT_COUNT) {
                card.classList.add('selected');
                selectedFlavors.push({ id: flavorId, name: flavorName });
            } else {
                alert(`フレーバーは${MAX_SELECT_COUNT}種類までしか選択できません。`);
            }
        }
        updateOrderButtonState();
    }

    // ボタンの状態と選択表示を更新
    function updateOrderButtonState() {
        if (selectedFlavors.length > 0) {
            orderButtonEl.disabled = false;
            const names = selectedFlavors.map(f => f.name).join(' + ');
            selectedDisplayEl.textContent = names;
        } else {
            orderButtonEl.disabled = true;
            selectedDisplayEl.textContent = '';
        }
    }

    // ★★★ 変更点: 注文ボタンの処理をFlex Message対応に全面的に書き換え ★★★
    orderButtonEl.addEventListener('click', async () => {
        if (selectedFlavors.length === 0 || !userProfile) {
            alert('ユーザー情報が取得できていません。もう一度お試しください。');
            return;
        }

        // Flex Messageを組み立てる
        const flexMessage = createFlexMessage(userProfile.displayName, selectedFlavors);

        try {
            if (liff.isInClient()) {
                await liff.sendMessages([flexMessage]);
                liff.closeWindow();
            } else {
                // LINE内ブラウザ以外で開いた場合の動作（テスト用）
                console.log("送信するFlex Message:", JSON.stringify(flexMessage, null, 2));
                alert("LINE内でのみメッセージを送信できます。コンソールログに出力しました。");
            }
        } catch (error) {
            console.error(error);
            alert('メッセージの送信に失敗しました。');
        }
    });

    // ★★★ 変更点: Flex MessageのJSONオブジェクトを生成する関数を追加 ★★★
    function createFlexMessage(userName, flavors) {
        // 選択されたフレーバーリストのコンポーネントを動的に生成
        const flavorComponents = flavors.map(flavor => ({
            "type": "box",
            "layout": "horizontal",
            "margin": "md",
            "contents": [
                {
                    "type": "text",
                    "text": "・",
                    "flex": 0
                },
                {
                    "type": "text",
                    "text": flavor.name,
                    "wrap": true,
                    "flex": 5
                }
            ]
        }));

        // Flex Message全体の構造
        return {
            "type": "flex",
            "altText": `${userName}さんからフレーバーの注文です`,
            "contents": {
                "type": "bubble",
                "header": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "新規オーダー",
                            "color": "#ffffff",
                            "weight": "bold",
                            "size": "lg"
                        }
                    ],
                    "backgroundColor": "#1DB446"
                },
                "body": {
                    "type": "box",
                    "layout": "vertical",
                    "spacing": "md",
                    "contents": [
                        {
                            "type": "text",
                            "text": `${userName} 様からのご注文`,
                            "weight": "bold",
                            "size": "xl",
                            "wrap": true
                        },
                        {
                            "type": "separator",
                            "margin": "lg"
                        },
                        // ここに動的に生成したフレーバーリストが入る
                        ...flavorComponents,
                        {
                            "type": "separator",
                            "margin": "lg"
                        }
                    ]
                },
                "footer": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "ご準備をお願いいたします。",
                            "size": "sm",
                            "color": "#888888",
                            "wrap": true,
                            "align": "center"
                        }
                    ]
                }
            }
        };
    }
};
