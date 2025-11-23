import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, BookOpen, PenTool, Edit3, Settings, Cloud, Loader2, X, ChevronRight, PlusCircle, Save, Play, ChevronDown, RefreshCcw, Database, UploadCloud, Volume2, Wifi, WifiOff, AlertCircle } from 'lucide-react';

// ----------------------------------------------------------------------
// 🔧 VS Code 本地开发：请【取消】下面这一行的注释
// ----------------------------------------------------------------------
import HanziWriter from 'hanzi-writer'; 

// 引入 Firebase
import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, writeBatch } from 'firebase/firestore';

// ==========================================
// 1. 完整原始数据源
// ==========================================
const RAW_DATA_SOURCE = `
爱	ài	7	1
吧	ba	10	2
帮	bāng	12	2
包	bāo	5	2
宝	bǎo	7	2
本	běn	2	2
笔	bǐ	2	2
别	bié	6	2
不	bù	2	2
长	cháng	11	2
唱	chàng	5	2
从	cóng	11	2
蛋	dàn	5	2
地	dì	8	2
得	de	7	2
点	diǎn	12	2
动	dòng	9	2
都	dōu	8	2
读	dú	1	2
对	duì	4	2
饿	è	6	2
发	fā	10	2
房	fáng	6	2
放	fàng	3	2
飞	fēi	9	2
告	gào	3	2
哥	gē	1	2
给	gěi	5	2
跟	gēn	8	2
工	gōng	—	2
公	gōng	—	2
古	gǔ	—	2
瓜	guā	—	2
关	guān	—	2
光	guāng	9	2
国	guó	11	2
果	guǒ	5	2
还	hái	6	2
孩	hái	4	2
海	hǎi	12	2
汉	hàn	1	2
河	hé	9	2
很	hěn	8	2
湖	hú	9	2
华	huá	11	2
画	huà	1	2
欢	huān	1	2
会	huì	6	2
活	huó	12	2
记	jì	4	2
假	jiǎ	12	2
间	jiān	6	2
件	jiàn	7	2
江	jiāng	—	2
讲	jiǎng	2	2
教	jiāo	1	2
教	jiào	2	2
姐	jiě	—	2
今	jīn	3	2
具	jù	—	2
觉	jué	—	2
卡	kǎ	5	2
考	kǎo	7	2
可	kě	6	2
快	kuài	12	2
乐	lè	12	2
里	lǐ	2	2
两	liǎng	7	2
亮	liàng	8	2
流	liú	9	2
旅	lǚ	12	2
吗	ma	2	2
买	mǎi	5	2
么	me	8	2
没	méi	4	2
苗	miáo	10	2
名	míng	11	2
明	míng	—	2
母	mǔ	11	2
哪	nǎ	8	2
那	nà	2	2
脑	nǎo	7	2
期	qī	3	2
起	qǐ	4	2
亲	qīn	11	2
请	qǐng	4	2
谁	shuí	3	2
什	shén	8	2
时	shí	9	2
拾	shí	6	2
事	shì	6	2
室	shì	2	2
收	shōu	6	2
书	shū	2	2
树	shù	10	2
双	shuāng	7	2
思	sī	7	2
诉	sù	3	2
岁	suì	5	2
它	tā	11	2
她	tā	2	2
条	tiáo	11	2
听	tīng	3	2
玩	wán	5	2
万	wàn	7	2
为	wéi	8	2
问	wèn	3	2
午	wǔ	3	2
务	wù	12	2
物	wù	12	2
洗	xǐ	6	2
喜	xǐ	1	2
系	xì	4	2
想	xiǎng	9	2
写	xiě	1	2
谢	xiè	4	2
心	xīn	3	2
星	xīng	3	2
芽	yá	10	2
洋	yáng	12	2
要	yào	10	2
也	yě	8	2
夜	yè	9	2
以	yǐ	12	2
泳	yǒng	2	2
用	yòng	4	2
游	yóu	9	2
友	yǒu	3	2
又	yòu	7	2
语	yǔ	1	2
远	yuǎn	8	2
在	zài	1	2
再	zài	4	2
张	zhāng	5	2
长	zhǎng	9	2
着	zhe	11	2
种	zhǒng	10	2
种	zhòng	10	2
子	zǐ	2	2
字	zì	1	2
最	zuì	11	2
昨	zuó	5	2
作	zuò	7	2
做	zuò	4	2
爱	ài	7	1
八	bā	1	1
爸	bà	9	1
白	bái	6	1
百	bǎi	1	1
北	běi	11	1
草	cǎo	6	1
车	chē	8	1
虫	chóng	6	1
出	chū	4	1
穿	chuān	12	1
春	chūn	5	1
大	dà	2	1
戴	dài	12	1
到	dào	12	1
的	de	9	1
地	dì	5	1
电	diàn	5	1
东	dōng	11	1
冬	dōng	5	1
多	duō	2	1
儿	ér	10	1
耳	ěr	2	1
二	èr	1	1
方	fāng	11	1
风	fēng	—	1
高	gāo	8	1
个	gè	10	1
好	hǎo	8	1
禾	hé	3	1
和	hé	9	1
黑	hēi	6	1
红	hóng	6	1
后	hòu	—	1
花	huā	10	1
黄	huáng	6	1
火	huǒ	3	1
季	jì	10	1
家	jiā	9	1
见	jiàn	8	1
九	jiǔ	1	1
开	kāi	8	1
看	kàn	10	1
口	kǒu	2	1
来	lái	4	1
蓝	lán	6	1
老	lǎo	7	1
了	le	8	1
立	lì	4	1
六	liù	1	1
绿	lǜ	6	1
妈	mā	9	1
马	mǎ	6	1
帽	mào	12	1
门	mén	10	1
们	men	8	1
面	miàn	11	1
木	mù	3	1
目	mù	2	1
奶	nǎi	9	1
南	nán	11	1
闹	nào	12	1
你	nǐ	8	1
年	nián	10	1
鸟	niǎo	6	1
牛	niú	6	1
七	qī	1	1
前	qián	10	1
秋	qiū	5	1
去	qù	4	1
热	rè	12	1
人	rén	2	1
认	rèn	11	1
日	rì	3	1
入	rù	4	1
三	sān	1	1
山	shān	3	1
上	shàng	4	1
少	shǎo	2	1
身	shēn	12	1
生	shēng	7	1
师	shī	7	1
十	shí	1	1
石	shí	3	1
说	shuō	8	1
四	sì	1	1
是	shì	7	1
手	shǒu	2	1
水	shuǐ	3	1
他	tā	10	1
太	tài	11	1
体	tǐ	12	1
天	tiān	5	1
田	tián	3	1
同	tóng	7	1
头	tóu	2	1
土	tǔ	3	1
外	wài	10	1
文	wén	7	1
我	wǒ	7	1
五	wǔ	1	1
西	xī	11	1
习	xí	12	1
下	xià	4	1
夏	xià	5	1
向	xiàng	11	1
校	xiào	7	1
新	xīn	12	1
兴	xìng	8	1
学	xué	7	1
雪	xuě	5	1
羊	yáng	6	1
爷	yé	9	1
一	yī	1	1
衣	yī	12	1
有	yǒu	9	1
右	yòu	4	1
鱼	yú	6	1
雨	yǔ	5	1
园	yuán	10	1
月	yuè	2	1
云	yún	5	1
早	zǎo	8	1
这	zhè	9	1
真	zhēn	8	1
中	zhōng	4	1
祝	zhù	12	1
走	zǒu	4	1
足	zú	2	1
左	zuǒ	4	1
坐	zuò	4	1
把	bǎ	9	3
报	bào	2	3
被	bèi	12	3
鼻	bí	4	3
边	biān	4	3
变	biàn	5	3
便	biàn	9	3
病	bìng	3	3
布	bù	9	3
步	bù	10	3
猜	cāi	4	3
采	cǎi	4	3
层	céng	7	3
尝	cháng	6	3
常	cháng	8	3
成	chéng	5	3
吃	chī	2	3
冲	chōng	8	3
传	chuán	4	3
床	chuáng	7	3
打	dǎ	9	3
代	dài	9	3
带	dài	3	3
道	dào	1	3
得	dé	10	3
灯	dēng	1	3
等	děng	2	3
低	dī	7	3
弟	dì	1	3
第	dì	10	3
店	diàn	2	3
钓	diào	11	3
掉	diào	5	3
动	dòng	4	3
朵	duǒ	4	3
饭	fàn	2	3
粉	fěn	4	3
付	fù	2	3
盖	gài	8	3
干	gān	9	3
感	gǎn	3	3
干	gàn	12	3
根	gēn	12	3
更	gèng	7	3
狗	gǒu	6	3
故	gù	2	3
怪	guài	8	3
龟	guī	10	3
过	guò	6	3
喊	hǎn	12	3
候	hòu	5	3
壶	hú	8	3
护	hù	3	3
话	huà	2	3
谎	huǎng	12	3
回	huí	10	3
机	jī	8	3
几	jǐ	11	3
已	yǐ	6	3
交	jiāo	1	3
觉	jué	5	3
街	jiē	1	3
结	jié	11	3
经	jīng	11	3
晴	qíng	4	3
静	jìng	7	3
就	jiù	3	3
举	jǔ	7	3
决	jué	9	3
科	kē	8	3
刻	kè	12	3
课	kè	2	3
宽	kuān	1	3
拉	lā	1	3
狠	hěn	12	3
劳	láo	4	3
冷	lěng	5	3
理	lǐ	2	3
凉	liáng	6	3
量	liàng	3	3
楼	lóu	7	3
满	mǎn	6	3
慢	màn	10	3
忙	máng	1	3
猫	māo	6	3
冒	mào	3	3
妹	mèi	1	3
蜜	mì	4	3
拿	ná	2	3
呢	ne	2	3
能	néng	1	3
弄	nòng	12	3
爬	pá	10	3
跑	pǎo	5	3
皮	pí	9	3
片	piàn	9	3
骗	piàn	12	3
飘	piāo	5	3
破	pò	9	3
欺	qī	12	3
气	qì	8	3
汽	qì	5	3
千	qiān	7	3
钱	qián	2	3
然	rán	10	3
让	ràng	8	3
仍	réng	10	3
撒	sā	12	3
烧	shāo	3	3
声	shēng	12	3
诗	shī	7	3
士	shì	3	3
赛	sài	10	3
试	shì	8	3
首	shǒu	7	3
睡	shuì	5	3
糖	táng	6	3
甜	tián	6	3
跳	tiào	5	3
停	tíng	1	3
通	tōng	1	3
童	tóng	2	3
兔	tù	6	3
往	wǎng	1	3
望	wàng	7	3
位	wèi	8	3
温	wēn	3	3
乌	wū	10	3
咸	xián	6	3
现	xiàn	2	3
乡	xiāng	7	3
笑	xiào	11	3
盐	yán	6	3
眼	yǎn	4	3
药	yào	3	3
验	yàn	8	3
医	yī	3	3
疑	yí	7	3
已	yǐ	11	3
意	yì	10	3
英	yīng	8	3
院	yuàn	3	3
元	yuán	9	3
造	zào	9	3
怎	zěn	11	3
针	zhēn	3	3
争	zhēng	6	3
之	zhī	9	3
只	zhǐ	4	3
知	zhī	5	3
追	zhuī	10	3
捉	zhuō	11	3
自	zì	6	3
嘴	zuǐ	4	3
纸	zhǐ	9	3
珠	zhū	5	3
竹	zhú	9	3
专	zhuān	11	3
啊	a	2	4
安	ān	1	4
岸	àn	2	4
搬	bān	11	4
办	bàn	5	4
冰	bīng	11	4
伯	bó	5	4
才	cái	4	4
餐	cān	7	4
察	chá	11	4
场	chǎng	1	4
城	chéng	1	4
处	chù	4	4
船	chuán	10	4
串	chuàn	10	4
窗	chuāng	3	4
次	cì	12	4
聪	cōng	8	4
达	dá	12	4
答	dá	10	4
当	dāng	7	4
岛	dǎo	2	4
登	dēng	2	4
滴	dī	7	4
定	dìng	5	4
懂	dǒng	11	4
法	fǎ	8	4
非	fēi	1	4
分	fēn	2	4
封	fēng	1	4
服	fú	4	4
富	fù	1	4
该	gāi	5	4
刚	gāng	6	4
缸	gāng	8	4
宫	gōng	3	4
挂	guà	6	4
观	guān	11	4
广	guǎng	1	4
汗	hàn	7	4
航	háng	12	4
号	hào	1	4
喝	hē	5	4
化	huà	11	4
慌	huāng	8	4
既	jì	5	4
尖	jiān	10	4
健	jiàn	4	4
箭	jiàn	10	4
皆	jiē	7	4
接	jiē	6	4
界	jiè	12	4
进	jìn	1	4
劲	jìn	8	4
京	jīng	1	4
惊	jīng	8	4
景	jǐng	2	4
镜	jìng	3	4
久	jiǔ	9	4
救	jiù	8	4
康	kāng	4	4
靠	kào	9	4
颗	kē	9	4
空	kōng	9	4
哭	kū	8	4
苦	kǔ	7	4
块	kuài	8	4
啦	lā	6	4
捞	lāo	6	4
类	lèi	12	4
离	lí	9	4
力	lì	9	4
丽	lì	2	4
粒	lì	7	4
连	lián	9	4
林	lín	3	4
落	luò	7	4
毛	máo	10	4
美	měi	2	4
梦	mèng	12	4
迷	mí	3	4
眠	mián	7	4
妙	miào	11	4
泥	ní	12	4
农	nóng	7	4
努	nǔ	9	4
暖	nuǎn	4	4
盘	pán	7	4
碰	pèng	6	4
票	piào	1	4
平	píng	—	4
苹	píng	10	4
葡	pú	10	4
浅	qiǎn	5	4
桥	qiáo	2	4
清	qīng	9	4
晴	qíng	11	4
球	qiú	12	4
取	qǔ	1	4
趣	qù	3	4
全	quán	1	4
群	qún	6	4
如	rú	3	4
伞	sǎn	11	4
色	sè	2	4
晒	shài	4	4
勺	sháo	9	4
伸	shēn	6	4
深	shēn	5	4
狮	shī	2	4
实	shí	12	4
使	shǐ	8	4
世	shì	12	4
熟	shú	4	4
数	shù	9	4
孙	sūn	1	4
抬	tái	6	4
萄	táo	10	4
提	tí	1	4
啼	tí	7	4
厅	tīng	3	4
突	tù	5	4
弯	wān	10	4
完	wán	2	4
晚	wǎn	6	4
王	wáng	3	4
闻	wén	7	4
握	wò	10	4
戏	xì	8	4
细	xì	11	4
吓	xià	8	4
香	xiāng	3	4
像	xiàng	5	4
晓	xiǎo	7	4
些	xiē	3	4
辛	xīn	7	4
信	xìn	1	4
寻	xún	4	4
言	yán	11	4
沿	yán	2	4
仰	yǎng	9	4
样	yàng	3	4
叶	yè	11	4
影	yǐng	3	4
映	yìng	3	4
邮	yóu	1	4
于	yú	6	4
宇	yǔ	12	4
员	yuán	12	4
原	yuán	5	4
圆	yuán	10	4
砸	zá	8	4
照	zhào	4	4
正	zhèng	5	4
直	zhí	6	4
柱	zhù	2	4
著	zhù	9	4
装	zhuāng	8	4
座	zuò	2	4
`;

// ==========================================
// 2. 富媒体数据扩充 (Rich Data)
// ==========================================
const RICH_DATA_MAP = new Map([
  // === 重点修复：梦 ===
  ["梦", { 
    definition: "Dream", 
    structure: "上下结构", 
    radical: "木 (或夕)", 
    strokes: 11, 
    words: [
      "做梦 (Dreaming)", 
      "梦想 (Dream/Ambition)", 
      "美梦 (Sweet dream)",
      "梦见 (To dream of)"
    ], 
    sentences: [
      "我昨天做了一个美梦。", 
      "我的梦想是当一名宇航员。", 
      "小猫在梦里吃到了大鱼。"
    ] 
  }],

  // === 常用字优化 ===
  ["爱", { definition: "Love", structure: "上下", radical: "爪", strokes: 10, words: ["爱好 (Hobby)", "可爱 (Cute)", "爱人 (Lover)"], sentences: ["我爱我的家。", "你喜欢什么爱好？", "这个宝宝很可爱。"] }],
  ["谢", { definition: "Thank", structure: "左中右", radical: "讠", strokes: 12, words: ["谢谢 (Thanks)", "感谢 (Grateful)", "多谢 (Many thanks)"], sentences: ["谢谢你的帮助。", "我们要学会感谢父母。", "如果不小心做错了，要说对不起。"] }],
  ["游", { definition: "Swim/Tour", structure: "左右", radical: "氵", strokes: 12, words: ["游泳 (Swim)", "游戏 (Game)", "旅游 (Travel)"], sentences: ["我们要去海边游泳。", "这个电脑游戏很好玩。", "暑假我想去北京旅游。"] }],
  ["雪", { definition: "Snow", structure: "上下", radical: "雨", strokes: 11, words: ["下雪 (Snowing)", "雪花 (Snowflake)", "雪人 (Snowman)"], sentences: ["外面下雪了，好冷啊。", "我们一起去堆雪人吧！", "雪花是白色的。"] }],
]);

// ==========================================
// 语音合成工具函数
// ==========================================
const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  }
};

// ==========================================
// 设置组件
// ==========================================
const SettingsModal = ({ isOpen, onClose, onSave, onSync, isSyncing, isConnected }) => {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');

  useEffect(() => {
    const savedAppId = localStorage.getItem('mxnzp_app_id') || 'yht8jotxk8qllhot';
    const savedAppSecret = localStorage.getItem('mxnzp_app_secret') || 'A0WaDQ9lfGnPTA9eqHFE45ZR9LY3B4uQ';
    setAppId(savedAppId);
    setAppSecret(savedAppSecret);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 transform transition-all relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Settings size={20} className="text-teal-600"/>
            系统设置
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-6">
            {/* 状态显示 */}
            <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${isConnected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {isConnected ? <Wifi size={18}/> : <WifiOff size={18}/>}
                {isConnected ? "已连接到 Firebase 云端数据库" : "未连接数据库，请检查配置或权限"}
            </div>

          {/* 数据库同步 */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-2">
                <Database size={18} />
                一键上传数据
            </h4>
            <p className="text-xs text-indigo-600 mb-3">
                将本地的原始生字表 (RAW_DATA) 初始化到云端数据库。如果数据库为空，请务必执行此操作。
            </p>
            <button 
                onClick={onSync}
                disabled={isSyncing || !isConnected}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
                {isSyncing ? <Loader2 className="animate-spin" /> : <UploadCloud size={18} />}
                {isSyncing ? "正在上传数据..." : "立即上传 / 同步"}
            </button>
          </div>

          {/* API 设置 */}
          <div className="border-t pt-4">
            <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Cloud size={18} />
                MXNZP API 配置 (可选)
            </h4>
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">App ID</label>
                    <input 
                    type="text" 
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">App Secret</label>
                    <input 
                    type="text" 
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm"
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => {
                    localStorage.setItem('mxnzp_app_id', appId);
                    localStorage.setItem('mxnzp_app_secret', appSecret);
                    onSave({ appId, appSecret });
                    onClose();
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-lg transition mt-2"
                >
                    保存配置
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 核心组件：HanziWriter 封装 (智能描红)
// ==========================================
const HanziWriterBoard = ({ char, onLoaded }) => {
  const writerRef = useRef(null);
  const divRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mode, setMode] = useState('display'); 

  useEffect(() => {
    // 兼容 CDN 和 NPM
    const loadWriter = () => {
        if (window.HanziWriter) {
            initWriter();
        } else {
            // 尝试从 CDN 加载
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js';
            script.async = true;
            script.onload = () => initWriter();
            document.body.appendChild(script);
        }
    };
    // 尝试优先使用 NPM 导入的 HanziWriter
    if(typeof HanziWriter !== 'undefined') {
        initWriter();
    } else {
        loadWriter();
    }
  }, [char]);

  const initWriter = () => {
    if (!divRef.current) return;
    divRef.current.innerHTML = "";
    
    const WriterClass = (typeof HanziWriter !== 'undefined' ? HanziWriter : null) || window.HanziWriter;
    
    if (!WriterClass) return; 

    try {
      writerRef.current = WriterClass.create(divRef.current, char, {
        width: 300,
        height: 300,
        padding: 20,
        showOutline: true,
        strokeAnimationSpeed: 1, 
        delayBetweenStrokes: 200, 
        strokeColor: '#0d9488', 
        radicalColor: '#f59e0b', 
        outlineColor: '#e2e8f0', 
        drawingWidth: 20, 
        showCharacter: true, 
        showHintAfterMisses: 1, 
        highlightOnComplete: true,
      });
      if(onLoaded) onLoaded();
    } catch(e) {
      console.error("HanziWriter init error", e);
      divRef.current.innerHTML = "<div class='text-red-400 p-4 text-center'>⚠️ 无法加载笔顺</div>";
    }
  };

  const animate = () => {
    if (writerRef.current) {
      setIsAnimating(true);
      setMode('display');
      writerRef.current.animateCharacter({
        onComplete: () => setIsAnimating(false)
      });
    }
  };

  const startQuiz = () => {
    if (writerRef.current) {
      setMode('quiz');
      writerRef.current.quiz({
        onComplete: (res) => {
            alert(`太棒了！你写了 ${res.totalMistakes} 个错误。 (Great job!)`);
            speak("太棒了");
        }
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        className="relative bg-[#fff9e6] border-4 border-amber-600 rounded-2xl shadow-lg overflow-hidden select-none"
        style={{ width: '300px', height: '300px' }}
      >
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="w-full h-1/2 border-b border-dashed border-red-300 opacity-50"></div>
          <div className="absolute top-0 left-1/2 w-0 h-full border-r border-dashed border-red-300 opacity-50 transform -translate-x-1/2"></div>
          <div className="absolute top-0 left-0 w-full h-full border border-red-300 opacity-30 m-0"></div>
        </div>
        
        <div ref={divRef} className="absolute inset-0 z-10 cursor-crosshair" />
        
        <div className="absolute top-2 right-2 px-2 py-1 bg-white/80 rounded text-xs font-bold text-gray-500 shadow-sm backdrop-blur-sm">
            {mode === 'display' ? '👀 观看' : '✍️ 练习'}
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={animate}
          disabled={isAnimating}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-md transition transform active:scale-95 ${
            isAnimating ? 'bg-gray-100 text-gray-400' : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}
        >
          <Play size={18} fill={isAnimating ? "gray" : "white"} />
          {isAnimating ? '播放中...' : '看笔顺'}
        </button>

        <button 
          onClick={startQuiz}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-md transition transform active:scale-95 ${
            mode === 'quiz' ? 'bg-amber-500 text-white ring-2 ring-amber-200' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          <Edit3 size={18} />
          练一练
        </button>
      </div>
      
      <p className="text-xs text-gray-400 mt-2">
         {mode === 'quiz' ? '请在田字格中按笔顺写字' : '点击“看笔顺”观看动画，或点击“练一练”开始书写'}
      </p>
    </div>
  );
};

// ==========================================
// 可折叠释义组件
// ==========================================
const ExpandableDefinition = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  // Reset expansion when text changes (new character selected)
  useEffect(() => { setExpanded(false); }, [text]);

  const isLong = text && text.length > 60;

  return (
    <div className="relative">
      <p className={`text-lg text-gray-500 font-medium transition-all duration-300 ${expanded ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      {isLong && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-teal-600 text-sm font-bold mt-1 hover:text-teal-700 flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded"
        >
          {expanded ? "收起 (Collapse)" : "展开更多 (Expand)"}
          <ChevronRight size={14} className={`transform transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`} />
        </button>
      )}
    </div>
  );
};

// ==========================================
// 添加生字表单组件 (Add Form)
// ==========================================
const AddCharacterForm = ({ onAdd }) => {
  const [formData, setFormData] = useState({
    char: '', pinyin: '', definition: '', lesson: '', volume: '', words: '', sentences: '',
    structure: '', radical: '' , strokes: '' 
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.char) return;

    const newChar = {
      ...formData,
      id: `custom-${Date.now()}`,
      // 将换行分隔的文本转换为数组
      words: formData.words.split('\n').filter(w => w.trim()),
      sentences: formData.sentences.split('\n').filter(s => s.trim()),
      structure: formData.structure || '用户添加',
      radical: formData.radical || '-',
      strokes: '-',
      isRich: true, 
      isCustom: true,
      updatedAt: new Date()
    };

    onAdd(newChar);
    setFormData({ char: '', pinyin: '', definition: '', lesson: '', volume: '', words: '', sentences: '', structure: '', radical: '', strokes: ''  });
  };

  return (
    <div className="bg-white rounded-3xl shadow-md border border-teal-100 overflow-hidden mt-8 mb-10">
      <div className="bg-teal-600 px-6 py-4 flex items-center gap-2 text-white">
        <PlusCircle size={22} />
        <h2 className="text-lg font-bold">添加/补充生字 (数据库)</h2>
      </div>
      <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">汉字 (Char)</label>
              <input 
                required
                maxLength={1}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50" 
                value={formData.char}
                onChange={e => setFormData({...formData, char: e.target.value})}
                placeholder="例: 爱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">拼音 (Pinyin)</label>
              <input 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50" 
                value={formData.pinyin}
                onChange={e => setFormData({...formData, pinyin: e.target.value})}
                placeholder="例: ài"
              />
            </div>
          </div>

          {/* 新增：部首和结构输入框 */}
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">部首 (Radical)</label>
              <input 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50" 
                value={formData.radical}
                onChange={e => setFormData({...formData, radical: e.target.value})}
                placeholder="例: 氵"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结构 (Structure)</label>
              <input 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50" 
                value={formData.structure}
                onChange={e => setFormData({...formData, structure: e.target.value})}
                placeholder="例: 左右结构"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">笔画 (strokes)</label>
              <input 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50" 
                value={formData.strokes}
                onChange={e => setFormData({...formData, strokes: e.target.value})}
                placeholder="例: 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">册 (Volume)</label>
              <input 
                type="number"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50" 
                value={formData.volume}
                onChange={e => setFormData({...formData, volume: e.target.value})}
                placeholder="1"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">课次 (Lesson)</label>
              <input 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50" 
                value={formData.lesson}
                onChange={e => setFormData({...formData, lesson: e.target.value})}
                placeholder="7"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">释义 (Definition)</label>
            <input 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50" 
              value={formData.definition}
              onChange={e => setFormData({...formData, definition: e.target.value})}
              placeholder="English definition"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">扩展词语 (Words - 每行一个)</label>
            <textarea 
              className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm bg-slate-50" 
              value={formData.words}
              onChange={e => setFormData({...formData, words: e.target.value})}
              placeholder="爱好 (hobby)&#10;可爱 (cute)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">扩展例句 (Sentences - 每行一个)</label>
            <textarea 
              className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm bg-slate-50" 
              value={formData.sentences}
              onChange={e => setFormData({...formData, sentences: e.target.value})}
              placeholder="我爱我的家。&#10;这只猫很可爱。"
            />
          </div>
          <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-md">
            <Save size={20} />
            保存到数据库 (Save to Cloud)
          </button>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// 主应用组件
// ==========================================
export default function HanziLearningApp() {
  const [database, setDatabase] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChar, setSelectedChar] = useState(null);
  const [showList, setShowList] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiConfig, setApiConfig] = useState({ appId: '', appSecret: '' });
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // 初始化数据
  useEffect(() => {
    const savedAppId = localStorage.getItem('mxnzp_app_id');
    const savedAppSecret = localStorage.getItem('mxnzp_app_secret');
    const finalAppId = savedAppId || 'yht8jotxk8qllhot';
    const finalAppSecret = savedAppSecret || 'A0WaDQ9lfGnPTA9eqHFE45ZR9LY3B4uQ';
    setApiConfig({ appId: finalAppId, appSecret: finalAppSecret });
    
    if(!savedAppId) localStorage.setItem('mxnzp_app_id', finalAppId);
    if(!savedAppSecret) localStorage.setItem('mxnzp_app_secret', finalAppSecret);
  }, []);

  // 核心：监听 Firestore 数据
  useEffect(() => {
    if (!db) {
        console.error("Firebase DB 未初始化");
        return;
    }
    
    const q = query(collection(db, "characters"), orderBy("char"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setIsConnected(true); 
        const chars = [];
        querySnapshot.forEach((doc) => {
            chars.push({ id: doc.id, ...doc.data() });
        });
        
        if (chars.length > 0) {
            setDatabase(chars);
            if (!selectedChar) { 
                setTimeout(() => setSelectedChar(chars[0]), 0);
            }
        } else {
            setDatabase([]); 
        }
    }, (error) => {
       console.error("Firebase Listen Error:", error);
       setIsConnected(false);
       if(error.code === 'permission-denied') {
           setErrorMsg("权限不足：请在 Firebase 控制台将规则设置为 allow read, write: if true;");
       } else {
           setErrorMsg(`连接错误: ${error.message}`);
       }
    });
    
    return () => unsubscribe();
  }, []); 

  // 搜索过滤
  const filteredData = useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return database.filter(item => 
      item.char.includes(lowerTerm) || 
      item.pinyin.toLowerCase().includes(lowerTerm)
    );
  }, [searchTerm, database]);

  // 同步数据
  const handleSyncData = async () => {
    if (!confirm("确定要初始化数据库吗？这将把本地的原始数据上传到云端。")) return;
    setIsSyncing(true);
    try {
        // 使用 Promise.all 避免批量写入限制
        const lines = RAW_DATA_SOURCE.trim().split('\n');
        let count = 0;
        const promises = lines.map(async (line) => {
            const parts = line.split(/[\t\s]+/).filter(p => p);
            if (parts.length < 2) return;
            const char = parts[0];
            const richData = RICH_DATA_MAP.get(char);
            const docData = {
                char: parts[0],
                pinyin: parts[1],
                lesson: parts[2] || "-",
                volume: parts[3] || "-",
                definition: richData?.definition || "Chinese Character",
                structure: richData?.structure || "汉字",
                radical: richData?.radical || "-",
                strokes: richData?.strokes || "-",
                words: richData?.words || [],
                sentences: richData?.sentences || [],
                updatedAt: new Date()
            };
            await setDoc(doc(db, "characters", char), docData);
            count++;
        });

        await Promise.all(promises);
        alert(`同步完成！共上传了 ${count} 个汉字到云端数据库。`);
    } catch (error) {
        alert(`同步失败: ${error.message}`);
    } finally {
        setIsSyncing(false);
    }
  };

  // API 搜索
  const fetchCharacterFromApi = async (char) => {
    if (!apiConfig.appId || !apiConfig.appSecret) {
      alert("请先配置 API Key");
      setIsSettingsOpen(true);
      return;
    }
    setIsSearchingApi(true);
    try {
      const url = `https://www.mxnzp.com/api/convert/dictionary?content=${encodeURIComponent(char)}&app_id=${apiConfig.appId}&app_secret=${apiConfig.appSecret}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 1 && data.data && data.data.length > 0) {
        const res = data.data[0]; 
        const definition = res.explanation || "网络查询结果";
        const newChar = {
          char: char,
          pinyin: res.pinyin || "未知",
          lesson: 'Cloud',
          volume: 'API',
          definition: definition,
          structure: "API数据", 
          radical: res.radicals || "-", 
          strokes: res.strokes || "-", 
          words: ["暂无扩展词"], 
          sentences: [], 
          isCustom: true,
          updatedAt: new Date()
        };
        await setDoc(doc(db, "characters", char), newChar);
        alert("查询成功！已添加到本地字库。");
      } else {
        alert(`查询失败: ${data.msg || '未找到该字或接口异常'}`);
      }
    } catch (error) {
      alert("网络请求失败");
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleAddCharacter = async (newChar) => {
    try {
        await setDoc(doc(db, "characters", newChar.char), newChar);
        alert("保存成功！");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        alert("保存失败: " + e.message);
    }
  };

  const handleSelectChar = (char) => {
    setSelectedChar(char);
    setSearchTerm("");
    setShowList(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSave={setApiConfig} onSync={handleSyncData} isSyncing={isSyncing} isConnected={isConnected} />
      
      <header className="bg-gradient-to-r from-teal-600 to-teal-800 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm"><BookOpen size={24} className="text-white" /></div>
            <div>
                <h1 className="text-xl font-bold tracking-wide">汉字学习宝 (Winnie)</h1>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
                    <p className="text-xs text-teal-100 opacity-80">{isConnected ? '已连接' : '未连接'}</p>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-xs bg-black/20 px-3 py-1 rounded-full text-teal-50 font-mono border border-white/10 hidden sm:block">字数: {database.length}</div>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><Settings size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-8">
        
        {/* 错误提示区 */}
        {errorMsg && (
             <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
                 <AlertCircle /> {errorMsg}
             </div>
        )}

        {/* 数据库为空时的引导 */}
        {database.length === 0 && isConnected && !isSyncing && !errorMsg && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-10 text-center flex flex-col items-center">
                <Database size={48} className="text-blue-400 mb-4" />
                <h2 className="text-xl font-bold text-blue-800 mb-2">数据库已连接，但没有数据</h2>
                <p className="text-blue-600 mb-6 max-w-md">请点击下方按钮，将本地的生字表上传到云端。</p>
                <button onClick={() => setIsSettingsOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition font-bold flex items-center gap-2"><UploadCloud size={20} /> 去同步数据</button>
            </div>
        )}

        {/* 搜索框 */}
        <div className="relative">
          <div className="relative group">
            <input type="text" placeholder="🔍 搜索汉字..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowList(true)} className="w-full pl-14 pr-4 py-4 rounded-2xl border-2 border-teal-100 focus:border-teal-500 outline-none shadow-sm text-lg bg-white" />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-500"><Search size={20} /></div>
          </div>
          {showList && searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-96 overflow-y-auto divide-y divide-gray-50">
              {filteredData.length > 0 ? filteredData.map(item => (
                  <div key={item.char} onClick={() => handleSelectChar(item)} className="flex items-center justify-between p-4 hover:bg-teal-50 cursor-pointer"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-2xl font-serif font-bold">{item.char}</div><div><div className="font-bold text-gray-800">{item.pinyin}</div><div className="text-xs text-gray-400">{item.definition}</div></div></div></div>
              )) : <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-4"><p>本地未找到</p><button onClick={() => fetchCharacterFromApi(searchTerm)} disabled={isSearchingApi} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-full hover:scale-105 transition">{isSearchingApi ? <Loader2 className="animate-spin" /> : <Cloud size={20} />} 使用 API 搜索</button></div>}
            </div>
          )}
        </div>

        {/* 只有当选中了字才显示详情卡片 */}
        {selectedChar && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 flex flex-col gap-4"><div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[420px]"><HanziWriterBoard char={selectedChar.char} /></div></div>
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="flex gap-6 items-center">
                    <div className="w-24 h-24 bg-teal-600 rounded-2xl flex items-center justify-center text-white text-6xl font-serif shadow-lg cursor-pointer" onClick={() => speak(selectedChar.char)}>{selectedChar.char}</div>
                    <div><div className="flex items-baseline gap-3 mb-1"><h2 className="text-4xl font-bold text-gray-800">{selectedChar.pinyin}</h2><button onClick={() => speak(selectedChar.char)} className="text-teal-500 p-1 rounded-full"><Volume2 size={24} /></button></div><ExpandableDefinition text={selectedChar.definition} />
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border">结构: {selectedChar.structure}</span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border">部首: {selectedChar.radical}</span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border">笔画: {selectedChar.strokes}</span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border">册: {selectedChar.volume}</span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border">课次: {selectedChar.lesson}</span>
                    </div>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex-1 flex flex-col p-6">
                <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-4"><h4 className="text-xs font-bold text-gray-400 uppercase">Words</h4>{selectedChar.words && selectedChar.words.length > 0 ? selectedChar.words.map((w, i) => <div key={i} onClick={() => speak(w)} className="p-2 bg-slate-50 rounded cursor-pointer">{w}</div>) : <div className="text-sm text-gray-400 italic">暂无词组</div>}</div>
                    <div className="space-y-4"><h4 className="text-xs font-bold text-gray-400 uppercase">Sentences</h4>{selectedChar.sentences && selectedChar.sentences.length > 0 ? selectedChar.sentences.map((s, i) => <div key={i} onClick={() => speak(s)} className="p-2 bg-amber-50 rounded cursor-pointer">{s}</div>) : <div className="text-sm text-gray-400 italic">暂无例句</div>}</div>
                </div>
            </div>
          </div>
        </div>
        )}

        {/* 底部表单 */}
        <AddCharacterForm onAdd={handleAddCharacter} />

        <div className="text-center text-gray-400 text-sm py-4 pb-10">
          © 2023 Hanzi Learning App (Firebase Edition).
        </div>

      </main>
    </div>
  );
}