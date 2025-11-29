import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, Volume2, VolumeX, BookOpen, Layers, Type, RefreshCcw, 
  ChevronRight, PlusCircle, Save, Play, PenTool, Edit3, Trash2, 
  User, LogOut, Cloud, Loader2, UploadCloud, CheckCircle2, XCircle, 
  FileJson, Download, Gamepad2, Trophy, Crown, HelpCircle, RefreshCw, Star,
  Lock, Key, Mic, Activity, Settings, ThumbsUp, ThumbsDown, Eye, EyeOff
} from 'lucide-react';

// === Firebase Imports ===
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, 
  onAuthStateChanged, signInAnonymously, signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDocs, addDoc 
} from 'firebase/firestore';

// ==========================================
// 0. Firebase 配置
// ==========================================
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA5q760qD5nN4Jp8i70z4sudY7HBIEMrC4",
  authDomain: "hanzi-a1d84.firebaseapp.com",
  projectId: "hanzi-a1d84",
  storageBucket: "hanzi-a1d84.firebasestorage.app",
  messagingSenderId: "1056302111936",
  appId: "1:1056302111936:web:ac465b6ab5279703b8a125",
  measurementId: "G-D5TDVD9727"
};

const ADMIN_EMAILS = [
  "qiutingxiong@gmail.com",
  "ingrid.wangying@gmail.com",
  "xiongqiuting@gmail.com"
];

// ==========================================
// 1. 静态数据与工具函数
// ==========================================
const METADATA_DB = {
  "爱":"上下结构|爪|10", "吧":"左右结构|口|7", "帮":"上下结构|巾|9", "包":"半包围结构|勹|5", "宝":"上下结构|宀|8",
  "本":"独体字|木|5", "笔":"上下结构|竹|10", "别":"左右结构|刂|7", "不":"独体字|一|4", "长":"独体字|长|4",
  "国":"全包围结构|囗|8", "梦":"上下结构|木|11", "谢":"左中右结构|讠|12"
};

const RICH_DATA_MAP = new Map([
  ["梦", { words: ["梦想", "做梦", "美梦"], sentences: ["我的梦想是当一名宇航员。", "昨天晚上我做了一个美梦。"] }],
  ["爱", { words: ["爱好", "可爱", "爱人"], sentences: ["我爱我的家。", "你喜欢什么爱好？"] }],
]);

const STRUCTURE_OPTIONS = ["独体字", "左右结构", "上下结构", "左中右结构", "上中下结构", "全包围结构", "半包围结构", "品字形结构"];

const sanitizeWords = (wordsData) => {
    if (!wordsData) return [];
    if (Array.isArray(wordsData)) return wordsData;
    if (typeof wordsData === 'string') return wordsData.split('\n').filter(w => w.trim());
    return [];
};

// [修改] 更严格的标准化函数，移除所有标点符号和空格，只保留汉字、字母和数字
const normalizeText = (text) => {
  if (!text) return '';
  // 匹配所有非汉字、非字母、非数字的字符并将它们替换为空
  return text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "").toLowerCase();
};

const speak = (text, enabled = true) => {
  if (!enabled) return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  }
};

const lookupCharData = (char) => {
    let result = { pinyin: '', lesson: '', volume: '', structure: '独体字', radical: '', strokes: '', words: '', sentences: '' };
    const meta = METADATA_DB[char];
    if (meta) {
        const mp = meta.split('|');
        result.structure = mp[0] || '独体字'; result.radical = mp[1] || ''; result.strokes = mp[2] || '';
    }
    const rich = RICH_DATA_MAP.get(char);
    if (rich) {
        result.words = rich.words.join('\n');
        result.sentences = rich.sentences.join('\n');
    }
    return result;
};

// Firestore Helpers
const getAppId = () => typeof __app_id !== 'undefined' ? __app_id : null;

// [修改] 根据要求使用特定的集合路径逻辑
const getHanziCollection = (db) => {
    const isPreview = typeof __app_id !== 'undefined' && __app_id;
    if (isPreview) {
        return collection(db, 'artifacts', __app_id, 'public', 'data', 'characters');
    } else {
        return collection(db, 'characters');
    }
};

const getLeaderboardCollection = (db) => {
    const isPreview = typeof __app_id !== 'undefined' && __app_id;
    if (isPreview) {
        return collection(db, 'artifacts', __app_id, 'public', 'data', 'leaderboards');
    } else {
        return collection(db, 'leaderboards');
    }
};

const getUserCustomCollection = (db, userId) => {
    const isPreview = typeof __app_id !== 'undefined' && __app_id;
    if (isPreview) {
        return collection(db, 'artifacts', __app_id, 'users', userId, 'custom_words');
    } else {
        return collection(db, 'users', userId, 'custom_words');
    }
};

// ==========================================
// 2. 基础组件
// ==========================================

const HanziWriterBoard = ({ char }) => {
  const writerRef = useRef(null);
  const divRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mode, setMode] = useState('display'); 

  useEffect(() => {
    if (!window.HanziWriter) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js';
      script.async = true;
      script.onload = () => initWriter();
      document.body.appendChild(script);
    } else {
      initWriter();
    }
  }, [char]);

  const initWriter = () => {
    if (!divRef.current || !window.HanziWriter) return;
    divRef.current.innerHTML = "";
    try {
      writerRef.current = window.HanziWriter.create(divRef.current, char, {
        width: 260, height: 260, padding: 15, showOutline: true, strokeAnimationSpeed: 1, 
        delayBetweenStrokes: 200, strokeColor: '#0d9488', radicalColor: '#f59e0b', 
        outlineColor: '#e2e8f0', drawingWidth: 20, showCharacter: true, 
        showHintAfterMisses: 1, highlightOnComplete: true,
      });
    } catch(e) {
      divRef.current.innerHTML = `<div class="w-full h-full flex items-center justify-center text-8xl text-gray-300 font-serif">${char}</div>`;
    }
  };

  const animate = () => {
    if (writerRef.current && typeof writerRef.current.animateCharacter === 'function') {
      setIsAnimating(true); setMode('display');
      writerRef.current.animateCharacter({ onComplete: () => setIsAnimating(false) });
    }
  };

  const startQuiz = () => {
    if (writerRef.current && typeof writerRef.current.quiz === 'function') {
      setMode('quiz');
      writerRef.current.quiz({ onComplete: (res) => { alert(`太棒了！错误数: ${res.totalMistakes}`); speak("太棒了"); } });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative bg-[#fff9e6] border-4 border-amber-600 rounded-2xl shadow-lg overflow-hidden select-none" style={{ width: '260px', height: '260px' }}>
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="w-full h-1/2 border-b border-dashed border-red-300 opacity-50"></div>
          <div className="absolute top-0 left-1/2 w-0 h-full border-r border-dashed border-red-300 opacity-50 transform -translate-x-1/2"></div>
        </div>
        <div ref={divRef} className="absolute inset-0 z-10 cursor-crosshair" />
        <div className="absolute top-2 right-2 px-2 py-1 bg-white/80 rounded text-xs font-bold text-gray-500 shadow-sm backdrop-blur-sm">
            {mode === 'display' ? '👀 观看' : '✍️ 练习'}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={animate} disabled={isAnimating} className={`flex items-center gap-1 px-4 py-2 rounded-full font-bold shadow-md transition transform active:scale-95 text-sm ${isAnimating ? 'bg-gray-100 text-gray-400' : 'bg-teal-500 hover:bg-teal-600 text-white'}`}><Play size={16} /> 笔顺</button>
        <button onClick={startQuiz} className={`flex items-center gap-1 px-4 py-2 rounded-full font-bold shadow-md transition transform active:scale-95 text-sm ${mode === 'quiz' ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-200'}`}><Edit3 size={16} /> 练习</button>
      </div>
    </div>
  );
};

// ==========================================
// 3. 模态框组件
// ==========================================

const AuthModal = ({ isOpen, onClose, onLogin, isProcessing }) => {
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4"><User className="text-teal-600" size={32}/></div>
                <h3 className="text-xl font-bold mb-2">老师登录</h3>
                <p className="text-gray-500 mb-6 text-sm">登录后可管理汉字数据和导入导出</p>
                <button onClick={onLogin} disabled={isProcessing} className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-700 transition shadow-lg shadow-teal-100">{isProcessing ? <Loader2 className="animate-spin"/> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5"/>} 使用 Google 账号登录</button>
                <button onClick={onClose} className="mt-4 text-gray-400 text-sm hover:text-gray-600">暂不登录</button>
            </div>
        </div>
    );
};

const CustomWordsModal = ({ isOpen, onClose, customWords, onAdd, onDelete, isAdding }) => {
    const [newWord, setNewWord] = useState({ char: '', pinyin: '', sentence: '', definition: '' });
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b">
                     <h3 className="font-bold flex items-center gap-2"><Crown className="text-yellow-500"/> 我的生词本</h3>
                     <button onClick={onClose}><XCircle className="text-gray-400"/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-3">
                         <input className="p-2 border rounded" placeholder="生字/词" value={newWord.char} onChange={e=>setNewWord({...newWord, char:e.target.value})}/>
                         <input className="p-2 border rounded" placeholder="拼音" value={newWord.pinyin} onChange={e=>setNewWord({...newWord, pinyin:e.target.value})}/>
                         <input className="p-2 border rounded col-span-2" placeholder="例句" value={newWord.sentence} onChange={e=>setNewWord({...newWord, sentence:e.target.value})}/>
                         <input className="p-2 border rounded col-span-2" placeholder="释义" value={newWord.definition} onChange={e=>setNewWord({...newWord, definition:e.target.value})}/>
                         <button onClick={() => {if(newWord.char) { onAdd(newWord); setNewWord({char:'',pinyin:'',sentence:'',definition:''}); }}} disabled={isAdding || !newWord.char} className="col-span-2 bg-teal-600 text-white py-2 rounded font-bold">{isAdding ? "添加中..." : "添加生词"}</button>
                     </div>
                     {customWords.map(w => (
                         <div key={w.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
                             <div><div className="font-bold">{w.char} <span className="text-gray-400 font-normal text-sm">{w.pinyin}</span></div><div className="text-xs text-gray-500 truncate max-w-xs">{w.sentence}</div></div>
                             <button onClick={()=>onDelete(w.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                         </div>
                     ))}
                 </div>
             </div>
        </div>
    );
};

const ImportJsonModal = ({ isOpen, onClose, onImport }) => {
    const [jsonText, setJsonText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleImport = async () => {
        setIsProcessing(true); setErrorMsg("");
        try {
            const data = JSON.parse(jsonText);
            if (!Array.isArray(data)) throw new Error("JSON 格式错误：必须是一个数组 []");
            if (data.length > 0 && !data[0].char) throw new Error("JSON 数据缺少 'char' 字段");
            await onImport(data);
            setJsonText(""); onClose();
        } catch (e) { setErrorMsg(e.message); } finally { setIsProcessing(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileJson size={20} className="text-purple-500"/> 批量导入数据</h2>
                    <button onClick={onClose}><XCircle size={20} className="text-gray-400"/></button>
                </div>
                <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700"><p className="font-bold">JSON 示例:</p><pre className="bg-white p-2 rounded border border-blue-100 font-mono text-gray-600 overflow-x-auto">{`[{"char": "猫", "pinyin": "māo", "volume": "1", "lesson": "5", "words": ["小猫"], "sentences": ["我有一只猫"]}]`}</pre></div>
                    <textarea className="flex-1 w-full p-4 border-2 border-gray-200 rounded-xl font-mono text-sm resize-none" placeholder="在此粘贴 JSON 数组..." value={jsonText} onChange={e => setJsonText(e.target.value)} />
                    {errorMsg && <div className="text-red-500 text-sm flex items-center gap-2"><Settings size={14}/> {errorMsg}</div>}
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
                    <button onClick={handleImport} disabled={isProcessing || !jsonText} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md flex items-center gap-2 disabled:opacity-50">{isProcessing ? <Loader2 className="animate-spin" size={18}/> : <UploadCloud size={18}/>} 开始导入</button>
                </div>
            </div>
        </div>
    );
};

// [改进] 游戏设置弹窗 (支持内容类型选择)
const GameSettingsModal = ({ isOpen, onClose, onStart, database, userRole, hasCustomWords, gameType }) => {
    const [count, setCount] = useState(10);
    const [filterVol, setFilterVol] = useState("all");
    const [filterLesson, setFilterLesson] = useState("all");
    const [includeCustom, setIncludeCustom] = useState(false);
    
    // 新增：内容类型状态
    const [contentType, setContentType] = useState('chars'); 

    // 根据游戏类型自动切换默认的内容类型
    useEffect(() => {
        if (!isOpen) return;
        switch (gameType) {
            case 'splitMatch': // 连词大作战 -> 必须是词语
                setContentType('words');
                break;
            case 'readMatch': // 朗读挑战 -> 必须是例句(或词语)
                setContentType('sentences');
                break;
            case 'pinyinMatch': // 拼音对对碰 -> 主要是生字，现在支持选词语
                setContentType('chars');
                break;
            case 'geneMatch': // 基因匹配 -> 默认词语，也可生字
                setContentType('words'); 
                break;
            case 'flashcards': // 闪卡 -> 默认生字，也可词语
                setContentType('chars');
                break;
            default:
                setContentType('chars');
        }
    }, [isOpen, gameType]);

    if (!isOpen) return null;

    const sortLessons = (a, b) => (parseInt(a)||0) - (parseInt(b)||0);
    const volumes = [...new Set(database.map(i => i.volume).filter(v => v && v !== '-'))].sort();
    const lessons = [...new Set(database.filter(i => filterVol === 'all' || i.volume === filterVol).map(i => i.lesson).filter(l => l && l !== '-'))].sort(sortLessons);

    const getGameTitle = () => {
        switch(gameType) {
            case 'splitMatch': return '连词大作战';
            case 'pinyinMatch': return '拼音对对碰';
            case 'readMatch': return '朗读挑战';
            case 'geneMatch': return '基因匹配';
            case 'flashcards': return '闪卡记忆';
            default: return '游戏设置';
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Settings size={20} className="text-teal-600"/> {getGameTitle()}</h3>
                    <button onClick={onClose}><XCircle size={20} className="text-gray-400"/></button>
                </div>

                <div className="space-y-4">
                    {/* 选择游戏内容 */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <label className="text-xs font-bold text-gray-500 mb-2 block">测试内容</label>
                        <select 
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400"
                            value={contentType}
                            onChange={e => setContentType(e.target.value)}
                            // [修改] 重新锁定 pinyinMatch，同时保持其他游戏逻辑
                            disabled={['splitMatch', 'readMatch', 'pinyinMatch'].includes(gameType)}
                        >
                             <option value="chars">生字 (Characters)</option>
                             <option value="words">词语 (Words)</option>
                             <option value="sentences">例句 (Sentences)</option>
                        </select>
                        <div className="text-[10px] text-gray-400 mt-1 px-1">
                            {gameType === 'splitMatch' && "此游戏仅支持双字词语"}
                            {gameType === 'readMatch' && "此游戏测试整句朗读"}
                            {gameType === 'pinyinMatch' && "此游戏测试单字拼音"}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">数量</label>
                            <select className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" value={count} onChange={e => setCount(Number(e.target.value))}>
                                <option value={5}>5 个</option><option value={10}>10 个</option><option value={20}>20 个</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">册</label>
                            <select className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" value={filterVol} onChange={e => { setFilterVol(e.target.value); setFilterLesson('all'); }}>
                                <option value="all">全部</option>{volumes.map(v => <option key={v} value={v}>第 {v} 册</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">课</label>
                        <select className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" value={filterLesson} onChange={e => setFilterLesson(e.target.value)}>
                            <option value="all">全部</option>{lessons.map(l => <option key={l} value={l}>第 {l} 课</option>)}
                        </select>
                    </div>

                    {hasCustomWords && (
                        <div className="pt-2 border-t border-slate-100">
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-teal-100 bg-teal-50 cursor-pointer hover:bg-teal-100 transition">
                                <input type="checkbox" checked={includeCustom} onChange={e => setIncludeCustom(e.target.checked)} className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"/>
                                <div className="text-sm font-bold text-teal-800">混合我的生词本</div>
                            </label>
                        </div>
                    )}

                    <button onClick={() => onStart(gameType, { count, filterVol, filterLesson, includeCustom, contentType })} className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-200 hover:bg-teal-700 active:scale-95 transition-all mt-4">开始游戏</button>
                </div>
            </div>
        </div>
    );
};

const AdminCharacterForm = ({ isOpen, onClose, onSave, database, initialData, lastMeta }) => {
  const [formData, setFormData] = useState({ char: '', pinyin: '', definition: '', lesson: '', volume: '', structure: '独体字', radical: '', strokes: '', words: '', sentences: '' });
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData, words: Array.isArray(initialData.words)?initialData.words.join('\n'):'', sentences: Array.isArray(initialData.sentences)?initialData.sentences.join('\n'):'' });
        setIsAutoFilled(true);
      } else {
        setFormData({ char: '', pinyin: '', definition: '', lesson: lastMeta.lesson||'', volume: lastMeta.volume||'', structure: '独体字', radical: '', strokes: '', words: '', sentences: '' });
        setIsAutoFilled(false);
      }
    }
  }, [isOpen, initialData, lastMeta]);

  const handleCharChange = (e) => {
    const inputChar = e.target.value;
    setFormData(prev => ({ ...prev, char: inputChar }));
    if (inputChar.length === 1 && !initialData) {
        const exist = database.find(i => i.char === inputChar);
        if (exist) {
            setFormData({ ...exist, words: Array.isArray(exist.words) ? exist.words.join('\n') : '', sentences: Array.isArray(exist.sentences) ? exist.sentences.join('\n') : '' });
            setIsAutoFilled(true);
        } else {
            const autoData = lookupCharData(inputChar);
            setFormData(prev => ({ ...prev, pinyin: autoData.pinyin, lesson: lastMeta.lesson || autoData.lesson, volume: lastMeta.volume || autoData.volume, structure: autoData.structure, radical: autoData.radical, strokes: autoData.strokes, words: autoData.words, sentences: autoData.sentences }));
            setIsAutoFilled(false);
        }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.char) return;
    setIsSaving(true);
    await onSave({ ...formData, words: formData.words.split('\n').filter(w => w.trim()), sentences: formData.sentences.split('\n').filter(s => s.trim()) });
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {initialData ? <Edit3 size={20} className="text-blue-500"/> : <PlusCircle size={20} className="text-green-500"/>}
            {initialData ? "修改数据" : "录入生字"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><XCircle size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"><label className="block text-xs font-bold text-gray-500 mb-1">汉字 *</label><input required maxLength={1} className="w-full p-2 text-center text-xl font-bold border-2 border-teal-100 rounded-lg" value={formData.char} onChange={handleCharChange} placeholder="字" disabled={!!initialData} /></div>
            <div className="col-span-4"><label className="block text-xs font-bold text-gray-500 mb-1">拼音</label><input className="w-full p-2 border rounded-lg" value={formData.pinyin} onChange={e=>setFormData({...formData, pinyin:e.target.value})} placeholder="pīn yīn" /></div>
            <div className="col-span-5 flex items-end pb-2">{isAutoFilled ? <span className="text-xs text-green-600">已调用</span> : <span className="text-xs text-gray-400">自动查找...</span>}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div><label className="block text-xs font-bold text-gray-500 mb-1">册</label><input type="number" className="w-full p-2 border rounded-lg" value={formData.volume} onChange={e=>setFormData({...formData, volume:e.target.value})} /></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">课次</label><input className="w-full p-2 border rounded-lg" value={formData.lesson} onChange={e=>setFormData({...formData, lesson:e.target.value})} /></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">结构</label><select className="w-full p-2 border rounded-lg" value={formData.structure} onChange={e => setFormData({...formData, structure: e.target.value})}>{STRUCTURE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
             <div><label className="block text-xs font-bold text-gray-500 mb-1">部首</label><input className="w-full p-2 border rounded-lg" value={formData.radical} onChange={e=>setFormData({...formData, radical:e.target.value})} /></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">笔画数</label><input className="w-full p-2 border rounded-lg" value={formData.strokes} onChange={e=>setFormData({...formData, strokes:e.target.value})} /></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">英文释义</label><input className="w-full p-2 border rounded-lg" value={formData.definition} onChange={e=>setFormData({...formData, definition:e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs font-bold text-gray-500 mb-1">词语</label><textarea className="w-full p-2 border rounded-lg h-32 text-sm" value={formData.words} onChange={e=>setFormData({...formData, words:e.target.value})} /></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">例句</label><textarea className="w-full p-2 border rounded-lg h-32 text-sm" value={formData.sentences} onChange={e=>setFormData({...formData, sentences:e.target.value})} /></div>
          </div>
          <div className="pt-2 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-5 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
            <button type="submit" disabled={isSaving} className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg">{isSaving ? <Loader2 className="animate-spin"/> : <Save/>} {initialData ? "保存" : "添加"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 4. 游戏组件 (Game Components)
// ==========================================

const GameOverModal = ({ score, total, gameType, onRestart, onExit, db }) => {
    const [playerName, setPlayerName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [rankings, setRankings] = useState([]);

    useEffect(() => {
        if (!db) return;
        const fetchRankings = async () => {
            try {
                const colRef = getLeaderboardCollection(db);
                const snapshot = await getDocs(colRef);
                const data = snapshot.docs
                    .map(d => d.data())
                    .filter(d => d.gameType === gameType)
                    .sort((a,b) => b.score - a.score)
                    .slice(0, 10);
                setRankings(data);
            } catch (e) {
                console.error("Rankings fetch error", e);
            }
        };
        fetchRankings();
    }, [db, gameType, submitted]);

    const handleSubmitScore = async () => {
        if (!playerName.trim() || !db) return;
        setIsSubmitting(true);
        try {
            const colRef = getLeaderboardCollection(db);
            await addDoc(colRef, {
                name: playerName,
                score: score,
                total: total,
                gameType: gameType,
                date: new Date().toISOString()
            });
            setSubmitted(true);
        } catch (e) {
            console.error("Score submit failed", e);
            alert("分数提交失败");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-in zoom-in duration-300">
                <div className="flex justify-center mb-4">
                    <Trophy size={64} className="text-yellow-500 drop-shadow-lg" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">挑战结束!</h2>
                <div className="text-5xl font-black text-teal-600 mb-2">{score} <span className="text-xl text-gray-400 font-normal">分</span></div>
                
                {!submitted ? (
                    <div className="mt-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-sm text-gray-500 mb-3">输入名字，上榜单！</p>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="你的名字..."
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                                maxLength={10}
                            />
                            <button 
                                onClick={handleSubmitScore}
                                disabled={isSubmitting || !playerName}
                                className="px-4 py-2 bg-teal-600 text-white rounded-xl font-bold disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin"/> : "保存"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-6">
                        <h3 className="font-bold text-gray-700 mb-3 flex items-center justify-center gap-2"><Crown size={18} className="text-amber-500"/> 排行榜 Top 10</h3>
                        <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100 max-h-48 overflow-y-auto">
                            {rankings.map((r, idx) => (
                                <div key={idx} className={`flex justify-between items-center p-3 border-b border-slate-100 last:border-0 ${r.name === playerName && r.score === score ? 'bg-yellow-50' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium text-slate-700">{r.name}</span>
                                    </div>
                                    <span className="font-bold text-teal-600">{r.score}</span>
                                </div>
                            ))}
                            {rankings.length === 0 && <div className="p-4 text-gray-400 text-sm">虚位以待，等你来战！</div>}
                        </div>
                    </div>
                )}

                <div className="flex gap-3 mt-8">
                    <button onClick={onExit} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">退出</button>
                    <button onClick={onRestart} className="flex-1 py-3 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200 transition">再玩一次</button>
                </div>
            </div>
        </div>
    );
};

const GameHeader = ({ title, current, total, audioEnabled, toggleAudio, onExit }) => (
    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <button onClick={onExit} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 font-bold px-2">
            <ChevronRight className="rotate-180"/> 退出
        </button>
        <div className="font-bold text-lg text-slate-700">{title} <span className="text-sm bg-slate-100 px-2 py-1 rounded-full ml-2 text-slate-500">{current}/{total}</span></div>
    </div>
);

// [游戏 1] 连词大作战 (Split Word Match) - [修复] 增强词语提取逻辑
const SplitWordMatchGame = ({ items, onBack }) => {
    const [leftCol, setLeftCol] = useState([]); const [rightCol, setRightCol] = useState([]);
    const [selectedLeft, setSelectedLeft] = useState(null); const [matchedPairs, setMatchedPairs] = useState([]);
    const [score, setScore] = useState(0); const [pairs, setPairs] = useState([]);

    useEffect(() => {
        // [修复] 增加对 items 是否存在的判断，以及 trim() 处理
        if (!items || items.length === 0) return;

        const allWords = items.flatMap(i => sanitizeWords(i.words || [])).filter(w => w && w.trim().length >= 2);
        const uniqueWords = [...new Set(allWords)];
        
        // 如果提取不到词语，避免报错，直接不生成
        if (uniqueWords.length === 0) {
            setPairs([]); return;
        }

        const gameWords = uniqueWords.sort(() => Math.random() - 0.5).slice(0, 8).map((w, idx) => ({
            id: idx, full: w, left: w[0], right: w.slice(1)
        }));
        setPairs(gameWords);
        setLeftCol(gameWords.map(w => ({ id: w.id, val: w.left })).sort(() => Math.random() - 0.5));
        setRightCol(gameWords.map(w => ({ id: w.id, val: w.right })).sort(() => Math.random() - 0.5));
    }, [items]);

    const handleLeft = (item) => { if (matchedPairs.find(p => p.id === item.id)) return; setSelectedLeft(item); speak(item.val); };
    const handleRight = (item) => {
        if (!selectedLeft || matchedPairs.find(p => p.id === item.id)) return;
        if (selectedLeft.id === item.id) {
            const word = pairs.find(p => p.id === item.id);
            setMatchedPairs([...matchedPairs, word]); setScore(s => s + 10); speak(word.full); setSelectedLeft(null);
        } else { speak("Wrong"); setSelectedLeft(null); }
    };

    if (pairs.length > 0 && matchedPairs.length === pairs.length) return <GameOverModal score={score} total={pairs.length * 10} onRestart={onBack} onExit={onBack} />;
    
    // [改进] 提示信息更友好
    if (pairs.length === 0) return <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-full"><Search size={48} className="mb-4 text-gray-200"/> 没有找到足够的双字词语数据 <br/><span className="text-sm text-gray-300 mt-2">请尝试选择其他课程或添加更多含有词语的生字</span></div>;

    return (
        <div className="flex flex-col h-full">
            <GameHeader title="连词大作战" current={matchedPairs.length} total={pairs.length} onExit={onBack} />
            <div className="flex-1 flex gap-8 p-4">
                <div className="flex-1 flex flex-col gap-3">{leftCol.map(l => <button key={l.id} onClick={() => handleLeft(l)} disabled={matchedPairs.find(p=>p.id===l.id)} className={`h-16 rounded-xl text-2xl font-bold border-2 transition-all ${selectedLeft?.id===l.id ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-white border-indigo-100 text-indigo-900'} ${matchedPairs.find(p=>p.id===l.id) ? 'opacity-0' : 'opacity-100'}`}>{l.val}...</button>)}</div>
                <div className="flex-1 flex flex-col gap-3">{rightCol.map(r => <button key={r.id} onClick={() => handleRight(r)} disabled={matchedPairs.find(p=>p.id===r.id)} className={`h-16 rounded-xl text-2xl font-bold border-2 transition-all bg-white border-purple-100 text-purple-900 hover:bg-purple-50 ${matchedPairs.find(p=>p.id===r.id) ? 'opacity-0' : 'opacity-100'}`}>...{r.val}</button>)}</div>
            </div>
        </div>
    );
};

// [游戏 2] 拼音对对碰 (Char vs Pinyin) - [恢复] 仅限单字
const PinyinMatchGame = ({ items, onBack }) => {
    const [leftCol, setLeftCol] = useState([]); const [rightCol, setRightCol] = useState([]);
    const [selectedLeft, setSelectedLeft] = useState(null); const [matchedIds, setMatchedIds] = useState([]);
    
    useEffect(() => {
        // [恢复] 只处理单字，不处理词语
        let gameItems = items.map((item, idx) => ({ id: idx, char: item.char, pinyin: item.pinyin }));
        
        // 过滤掉没有内容的项目
        gameItems = gameItems.filter(i => i.char && i.char.trim());

        setLeftCol(gameItems.sort(() => Math.random() - 0.5));
        setRightCol([...gameItems].sort(() => Math.random() - 0.5));
    }, [items]);

    const handleLeft = (item) => { if (matchedIds.includes(item.id)) return; setSelectedLeft(item); speak(item.char); };
    const handleRight = (item) => {
        if (!selectedLeft || matchedIds.includes(item.id)) return;
        if (selectedLeft.id === item.id) { setMatchedIds([...matchedIds, item.id]); setSelectedLeft(null); speak("Right"); } else { speak("Wrong"); setSelectedLeft(null); }
    };

    if (matchedIds.length > 0 && matchedIds.length === leftCol.length) return <GameOverModal score={100} total={100} onRestart={onBack} onExit={onBack} />;

    return (
        <div className="flex flex-col h-full">
            <GameHeader title="拼音对对碰 (生字)" current={matchedIds.length} total={leftCol.length} onExit={onBack} />
            <div className="flex-1 flex gap-4 p-4 overflow-y-auto">
                <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                    {leftCol.map(l => (
                        <button key={l.id} onClick={() => handleLeft(l)} disabled={matchedIds.includes(l.id)} 
                            className={`h-24 rounded-xl text-3xl font-serif font-bold border-2 transition-all shadow-sm ${selectedLeft?.id===l.id ? 'bg-pink-500 text-white border-pink-600 scale-105' : 'bg-white border-pink-100 text-slate-700 hover:border-pink-300'} ${matchedIds.includes(l.id) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            {l.char}
                        </button>
                    ))}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                    {rightCol.map(r => (
                        <button key={r.id} onClick={() => handleRight(r)} disabled={matchedIds.includes(r.id)} 
                            className={`h-24 rounded-xl text-2xl font-bold border-2 transition-all shadow-sm bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 ${matchedIds.includes(r.id) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            {r.pinyin}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// [游戏 3] 基因匹配 (Original Word Match)
{/*const GeneMatchGame = ({ items, onBack, contentType }) => {
    const [words, setWords] = useState([]); const [definitions, setDefinitions] = useState([]);
    const [selectedWord, setSelectedWord] = useState(null); const [matchedIds, setMatchedIds] = useState([]);
    useEffect(() => {
        let gameItems = [];
        if (contentType === 'words') {
             gameItems = items.flatMap((item, idx) => {
                 const wList = sanitizeWords(item.words);
                 return wList.map((w, subIdx) => ({ id: `${idx}-${subIdx}`, word: w, meaning: item.definition || "暂无释义" }));
             }).slice(0, 10);
        } else {
             gameItems = items.map((item, idx) => ({ id: idx, word: item.char, meaning: item.definition || "暂无释义" }));
        }
        setWords(gameItems.sort(() => Math.random() - 0.5));
        setDefinitions([...gameItems].sort(() => Math.random() - 0.5));
    }, [items, contentType]);

    const handleWordClick = (id) => { if (matchedIds.includes(id)) return; setSelectedWord(id); speak(words.find(w => w.id === id).word); };
    const handleDefClick = (id) => {
        if (!selectedWord || matchedIds.includes(id)) return;
        if (selectedWord === id) { setMatchedIds([...matchedIds, id]); setSelectedWord(null); speak("Right"); } else { speak("Wrong"); setSelectedWord(null); }
    };
    if (matchedIds.length > 0 && matchedIds.length === words.length) return <GameOverModal score={100} total={100} onRestart={onBack} onExit={onBack} />;

    return (
        <div className="flex flex-col h-full">
            <GameHeader title="基因匹配" current={matchedIds.length} total={words.length} onExit={onBack} />
            <div className="flex-1 flex gap-4 p-4">
                <div className="w-[30%] flex flex-col gap-3 overflow-y-auto">{words.map(w => <button key={w.id} onClick={() => handleWordClick(w.id)} disabled={matchedIds.includes(w.id)} className={`h-20 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-all ${matchedIds.includes(w.id) ? 'opacity-0' : 'opacity-100'} ${selectedWord === w.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-slate-200 text-slate-800'}`}>{w.word}</button>)}</div>
                <div className="w-[70%] flex flex-col gap-3 overflow-y-auto">{definitions.map(d => <button key={d.id} onClick={() => handleDefClick(d.id)} disabled={matchedIds.includes(d.id)} className={`h-20 px-4 rounded-xl flex items-center justify-start text-sm text-left border-2 transition-all bg-white border-slate-200 text-slate-600 hover:bg-slate-50 ${matchedIds.includes(d.id) ? 'opacity-0' : 'opacity-100'}`}>{d.meaning}</button>)}</div>
            </div>
        </div>
    );
};*/}

// [改进] 朗读挑战 (Read Match) - 集成 Web Speech API
const ReadMatchGame = ({ items, onBack }) => {
    const [index, setIndex] = useState(0);
    const [isListening, setIsListening] = useState(false); 
    const [feedback, setFeedback] = useState(null); // null, 'listening', 'correct', 'incorrect'
    const [recognizedText, setRecognizedText] = useState("");

    const sentences = useMemo(() => {
        return items.flatMap(item => {
            const sList = sanitizeWords(item.sentences);
            return sList.map(s => ({ original: s, clean: normalizeText(s), hint: item.char }));
        }).filter(s => s.original.length > 2).slice(0, 10);
    }, [items]);
    
    const current = sentences[index];

    // 语音识别逻辑
    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("您的浏览器不支持语音识别，将使用模拟模式。请使用 Chrome 浏览器体验完整功能。");
            simulateListening();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;

        setIsListening(true);
        setFeedback('listening');
        setRecognizedText("");

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setRecognizedText(transcript);
            checkResult(transcript);
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            console.error("Speech error", event.error);
            setIsListening(false);
            setFeedback('error');
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const simulateListening = () => {
        setIsListening(true); setFeedback('listening');
        setTimeout(() => {
            setIsListening(false); 
            checkResult(current.clean);
        }, 1500);
    };

    // [改进] 比对逻辑，利用更严格的 normalizeText
    const checkResult = (transcript) => {
        const spoken = normalizeText(transcript);
        const target = current.clean;
        
        // 只要包含目标内容的核心文字即可（因为已经去除了所有标点和空格）
        if (spoken.includes(target) || target.includes(spoken) || spoken === target) {
            setFeedback('correct'); 
            speak("太棒了"); 
            setTimeout(() => { 
                setRecognizedText("");
                if (index < sentences.length - 1) { 
                    setIndex(prev => prev + 1); setFeedback(null); 
                } else { 
                    setIndex(prev => prev + 1); 
                } 
            }, 1500); 
        } else { 
            setFeedback('incorrect'); 
            speak("再试一次");
        }
    };

    if (!current) return <GameOverModal score={100} total={100} onRestart={onBack} onExit={onBack} />;
    
    return (
        <div className="flex flex-col h-full items-center p-6">
            <GameHeader title="朗读挑战" current={index + 1} total={sentences.length} onExit={onBack} />
            
            <div className="text-gray-400 font-bold mb-4 text-xl tracking-widest bg-gray-50 px-4 py-1 rounded-full">{current.hint}</div>
            
            <div className="w-full bg-white p-8 rounded-3xl border-2 border-blue-100 flex flex-col items-center justify-center min-h-[200px] shadow-sm mb-6">
                <p className="text-2xl font-medium text-slate-800 text-center leading-loose">{current.original}</p>
                {recognizedText && (
                    <div className="mt-4 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                        识别结果: "{recognizedText}"
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-4">
                {feedback === 'listening' && <div className="text-blue-500 animate-pulse font-bold">正在聆听...</div>}
                {feedback === 'correct' && <div className="text-green-500 font-bold flex items-center gap-2"><CheckCircle2/> 发音准确</div>}
                {feedback === 'incorrect' && <div className="text-red-500 font-bold flex items-center gap-2"><XCircle/> 请重读</div>}
                {feedback === 'error' && <div className="text-gray-400 text-xs">识别失败，请检查麦克风权限</div>}

                <button 
                    onClick={startListening} 
                    disabled={isListening || feedback === 'correct'}
                    className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                        isListening ? 'bg-red-500 scale-110 ring-8 ring-red-100' : 
                        feedback === 'correct' ? 'bg-green-500 scale-0' : 
                        'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                    }`}
                >
                    {isListening ? <Activity className="text-white animate-pulse" size={40}/> : <Mic className="text-white" size={40}/>}
                </button>
                <p className="text-gray-400 text-sm mt-2">点击话筒，大声朗读例句</p>
            </div>
        </div>
    );
};

// [恢复] 闪卡记忆 (FlashCard) - 网格 + 弹窗 + 老师评分 + 手动发音
const FlashCardGame = ({ items, onBack, db, contentType }) => { // 接收 contentType
    const [score, setScore] = useState(0);
    const [audioEnabled, setAudioEnabled] = useState(false); 
    const [cards, setCards] = useState([]);
    const [collected, setCollected] = useState([]);
    const [mistakes, setMistakes] = useState([]);
    const [gameOver, setGameOver] = useState(false);
    const [flippedCard, setFlippedCard] = useState(null);
    const [showPinyin, setShowPinyin] = useState(false); 

    useEffect(() => {
        let allCardsData = [];
        
        // [修复] 根据 contentType 生成卡片
        if (contentType === 'sentences') {
            // 例句模式
            items.forEach(item => {
                const sList = sanitizeWords(item.sentences);
                if (sList.length > 0) {
                    sList.forEach(s => {
                        allCardsData.push({
                            text: s,
                            pinyin: '', 
                            sentence: '', // 正面就是例句，所以不需要额外例句字段
                            definition: `${item.char} (${item.pinyin}) - ${item.definition || '暂无释义'}` // 背面显示生字信息
                        });
                    });
                }
            });
        } else if (contentType === 'words') {
            // 词语模式
            items.forEach(item => {
                const wList = sanitizeWords(item.words);
                const sList = sanitizeWords(item.sentences);
                if (wList.length > 0) {
                    wList.forEach((word, idx) => {
                        allCardsData.push({ 
                            text: word, 
                            pinyin: item.pinyin || '',
                            sentence: sList[idx] || '', 
                            definition: item.definition 
                        });
                    });
                }
            });
        } else {
            // 生字模式 (默认)
            items.forEach(item => {
                const sList = sanitizeWords(item.sentences);
                if (item.char) {
                    allCardsData.push({ 
                        text: item.char, 
                        pinyin: item.pinyin,
                        sentence: sList[0] || '', 
                        definition: item.definition
                    });
                }
            });
        }

        // 去重逻辑 (针对 text)
        const uniqueMap = new Map();
        allCardsData.forEach(w => uniqueMap.set(w.text, w));
        const uniqueCards = Array.from(uniqueMap.values());

        const gameCards = uniqueCards.sort(() => Math.random() - 0.5).slice(0, 20).map((w,i) => ({
            id: i, 
            content: w.text, 
            pinyin: w.pinyin,
            sentence: w.sentence, 
            definition: w.definition,
            status: 'hidden'
        }));
        setCards(gameCards);
    }, [items, contentType]);

    const handleFlip = (card) => {
        speak(card.content, audioEnabled);
        setFlippedCard(card); // Open Modal
        setShowPinyin(false); 
    };

    const handleGrade = (isCorrect) => {
        if (!flippedCard) return;
        const cardId = flippedCard.id;
        
        setCards(prev => prev.filter(c => c.id !== cardId));
        setFlippedCard(null); // Close Modal

        if (isCorrect) {
            setScore(s => s + 1);
            setCollected(prev => [...prev, flippedCard]);
        } else {
            setMistakes(prev => [...prev, { ...flippedCard, status: 'hidden' }]); 
        }
    };

    const handleRetryMistakes = () => {
        setCards(mistakes.sort(() => Math.random() - 0.5));
        setMistakes([]);
    };

    const getTitle = () => {
        if (contentType === 'sentences') return "例句闪卡";
        if (contentType === 'words') return "词语闪卡";
        return "生字闪卡";
    };

    return (
        <div className="flex h-full gap-4">
            <div className="w-48 flex flex-col gap-4">
                <div className="bg-red-50 rounded-2xl border border-red-100 p-4 h-full flex flex-col">
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2"><XCircle size={14}/> 纠错本</h3>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {mistakes.map((m, idx) => <div key={idx} className="bg-white p-2 rounded text-sm text-slate-600 shadow-sm border-l-4 border-red-300">{m.content}</div>)}
                    </div>
                    {mistakes.length > 0 && cards.length === 0 && <button onClick={handleRetryMistakes} className="mt-3 w-full py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-md animate-bounce"><RefreshCw size={14} className="inline mr-1"/> 重练错题</button>}
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <GameHeader title={getTitle()} current={collected.length} total={collected.length + cards.length + mistakes.length} audioEnabled={audioEnabled} toggleAudio={() => setAudioEnabled(!audioEnabled)} onExit={onBack} />
                <div className="flex-1 bg-slate-50/50 rounded-3xl border border-slate-200 p-4 overflow-y-auto relative">
                    {cards.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {cards.map((card) => (
                                <div key={card.id} className="aspect-[4/3] rounded-2xl shadow-sm border-2 bg-gradient-to-br from-teal-400 to-teal-600 border-teal-600 hover:scale-105 transition cursor-pointer flex items-center justify-center" onClick={() => handleFlip(card)}>
                                    <div className="text-white/30"><HelpCircle size={32}/></div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="h-full flex flex-col items-center justify-center text-gray-400"><Star size={48} className="text-yellow-400 mb-4"/><p>练习完成！</p><button onClick={() => setGameOver(true)} className="mt-6 px-8 py-3 bg-teal-600 text-white rounded-full font-bold shadow-lg">查看成绩</button></div>}
                </div>
            </div>

            <div className="w-48 flex flex-col gap-4">
                <div className="bg-green-50 rounded-2xl border border-green-100 p-4 h-full flex flex-col">
                    <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-2"><Save size={14}/> 收集箱 ({score})</h3>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {collected.map((c, idx) => <div key={idx} className="bg-white p-2 rounded text-sm text-green-700 shadow-sm border-l-4 border-green-400 animate-in slide-in-from-left">{c.content}</div>)}
                    </div>
                </div>
            </div>

            {/* BIG CARD MODAL */}
            {flippedCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-5xl aspect-[4/3] rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-8 relative animate-in zoom-in-95 duration-300 border-8 border-teal-100">
                        {/* Audio Button - Manual Trigger */}
                        <button onClick={() => speak(flippedCard.content)} className="absolute top-8 left-8 p-3 bg-teal-50 text-teal-600 rounded-full hover:bg-teal-100 transition shadow-sm z-50">
                            <Volume2 size={24}/>
                        </button>

                        <div className="absolute top-8 right-8">
                            <button onClick={() => setShowPinyin(!showPinyin)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition">
                                {showPinyin ? <EyeOff size={20}/> : <Eye size={20}/>}
                                {showPinyin ? "隐藏拼音" : "查看拼音"}
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                            {showPinyin && <div className="text-5xl font-bold text-gray-400 mb-4">{flippedCard.pinyin}</div>}
                            <div 
                                className={`font-bold text-slate-800 leading-tight text-center break-words ${contentType === 'sentences' ? 'text-6xl px-12' : 'text-[10rem]'}`}
                                style={{ fontFamily: '"KaiTi", "STKaiti", "SimKai", serif', lineHeight: '1.1' }}
                            >
                                {flippedCard.content}
                            </div>
                            
                            {/* 如果是生字或词语模式，显示例句 */}
                            {contentType !== 'sentences' && flippedCard.sentence && (
                                <div className="mt-6 text-xl text-slate-500 max-w-2xl text-center bg-slate-50 px-6 py-3 rounded-xl border border-slate-100">
                                    <span className="font-bold mr-2 text-slate-400">例句:</span>
                                    {flippedCard.sentence}
                                </div>
                            )}

                            {/* 如果是例句模式，显示来源释义 */}
                            {contentType === 'sentences' && flippedCard.definition && (
                                <div className="mt-6 text-xl text-slate-500 max-w-2xl text-center bg-slate-50 px-6 py-3 rounded-xl border border-slate-100">
                                    <span className="font-bold mr-2 text-slate-400">来源:</span>
                                    {flippedCard.definition}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-12 mb-8 mt-4">
                            <button onClick={() => handleGrade(true)} className="p-3 bg-green-100 text-green-600 rounded-full hover:bg-green-500 hover:text-white transition transform hover:scale-110 shadow-lg">
                                <CheckCircle2 size={40}/>
                            </button>
                            <button onClick={() => handleGrade(false)} className="p-3 bg-red-100 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition transform hover:scale-110 shadow-lg">
                                <XCircle size={40}/>
                            </button>
                        </div>
                        <p className="absolute bottom-6 text-gray-400 text-sm">请朗读内容，老师评分</p>
                    </div>
                </div>
            )}

            {gameOver && <GameOverModal score={score} total={collected.length + mistakes.length} gameType="flashcards" onRestart={() => window.location.reload()} onExit={onBack} db={db} />}
        </div>
    );
};

const GameSelector = ({ onOpenSettings }) => (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Gamepad2 className="text-purple-500"/> 游戏练习中心</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button onClick={() => onOpenSettings('splitMatch')} className="group p-6 bg-indigo-50 hover:bg-indigo-100 rounded-2xl border-2 border-indigo-100 hover:border-indigo-300 transition text-left h-full">
                <div className="text-3xl mb-3">🧩</div>
                <div className="font-bold text-indigo-800 text-lg">连词大作战</div>
                <div className="text-xs text-indigo-500 mt-1">词语拆分与组合</div>
            </button>
            <button onClick={() => onOpenSettings('pinyinMatch')} className="group p-6 bg-pink-50 hover:bg-pink-100 rounded-2xl border-2 border-pink-100 hover:border-pink-300 transition text-left h-full">
                <div className="text-3xl mb-3">🅰️</div>
                <div className="font-bold text-pink-800 text-lg">拼音对对碰</div>
                <div className="text-xs text-pink-500 mt-1">汉字 vs 拼音</div>
            </button>
            <button onClick={() => onOpenSettings('readMatch')} className="group p-6 bg-blue-50 hover:bg-blue-100 rounded-2xl border-2 border-blue-100 hover:border-blue-300 transition text-left h-full">
                <div className="text-3xl mb-3">🎤</div>
                <div className="font-bold text-blue-800 text-lg">朗读挑战</div>
                <div className="text-xs text-blue-500 mt-1">朗读例句 (语音识别)</div>
            </button>
            {/* <button onClick={() => onOpenSettings('geneMatch')} className="group p-6 bg-teal-50 hover:bg-teal-100 rounded-2xl border-2 border-teal-100 hover:border-teal-300 transition text-left h-full">
                <div className="text-3xl mb-3">🧬</div>
                <div className="font-bold text-teal-800 text-lg">基因匹配</div>
                <div className="text-xs text-teal-500 mt-1">词/字 vs 释义</div>
            </button> */}
            <button onClick={() => onOpenSettings('flashcards')} className="group p-6 bg-amber-50 hover:bg-amber-100 rounded-2xl border-2 border-amber-100 hover:border-amber-300 transition text-left h-full">
                <div className="text-3xl mb-3">📇</div>
                <div className="font-bold text-amber-800 text-lg">闪卡记忆</div>
                <div className="text-xs text-amber-500 mt-1">手动发音，积分排行</div>
            </button>
        </div>
    </div>
);

// ==========================================
// 主应用 (Main)
// ==========================================
export default function HanziLearningApp() {
  const [database, setDatabase] = useState([]); 
  const [customWords, setCustomWords] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChar, setSelectedChar] = useState(null);
  const [showList, setShowList] = useState(false);
  
  // Game State
  const [appMode, setAppMode] = useState('learn'); 
  const [gameConfig, setGameConfig] = useState(null); 
  const [isGameSettingsOpen, setIsGameSettingsOpen] = useState(false);
  const [pendingGameType, setPendingGameType] = useState(null);

  // Auth State
  const [user, setUser] = useState(null);
  const [isFirebaseAdmin, setIsFirebaseAdmin] = useState(false);
  const [isManualAdmin, setIsManualAdmin] = useState(false);
  const isAdmin = isFirebaseAdmin || isManualAdmin; 
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isCustomAdding, setIsCustomAdding] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState(null);
  const [lastMeta, setLastMeta] = useState({ volume: '', lesson: '' });

  const firebaseApp = useRef(null);
  const auth = useRef(null);
  const db = useRef(null);

  // 1. Init Firebase
  useEffect(() => {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : YOUR_FIREBASE_CONFIG;
        if (!firebaseConfig.apiKey) return;
        firebaseApp.current = initializeApp(firebaseConfig);
        auth.current = getAuth(firebaseApp.current);
        db.current = getFirestore(firebaseApp.current);
        
        const initAuth = async () => {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth.current, __initial_auth_token);
            } else {
                await signInAnonymously(auth.current);
            }
        };
        initAuth();

        onAuthStateChanged(auth.current, (currentUser) => {
            setUser(currentUser);
            if (currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email)) {
                setIsFirebaseAdmin(true);
            } else {
                setIsFirebaseAdmin(false);
            }
        });
    } catch (err) { console.error("Firebase init failed:", err); }
  }, []);

  // 2. Listen Data
  useEffect(() => {
    if (!db.current || !user) return;
    const unsubscribe = onSnapshot(getHanziCollection(db.current), (snapshot) => {
        const cloudData = [];
        snapshot.forEach(doc => cloudData.push({ ...doc.data(), id: doc.id }));
        cloudData.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
        setDatabase(cloudData);
        if (!selectedChar && cloudData.length > 0) setSelectedChar(cloudData[0]);
    });
    return () => unsubscribe();
  }, [user]);

  // Custom words logic
  useEffect(() => {
    if (!db.current || !user) { setCustomWords([]); return; }
     if (!user.isAnonymous) {
        const unsubscribe = onSnapshot(getUserCustomCollection(db.current, user.uid), (snapshot) => {
            const myWords = []; snapshot.forEach(doc => myWords.push({ ...doc.data(), id: doc.id }));
            setCustomWords(myWords);
        }, (error) => console.log("Private DB access denied or skipped"));
        return () => unsubscribe();
     }
  }, [user]);

  // Actions
  const handleLogin = async () => {
      if (!auth.current) { setIsManualAdmin(true); setIsAuthModalOpen(false); return; }
      setIsProcessingAuth(true);
      try { await signInWithPopup(auth.current, new GoogleAuthProvider()); } 
      catch (error) { if(confirm("登录受阻。开启演示模式？")) setIsManualAdmin(true); }
      setIsProcessingAuth(false);
      setIsAuthModalOpen(false);
  };
  const handleLogout = async () => { 
      if (auth.current) { await signOut(auth.current); await signInAnonymously(auth.current); } 
      setIsFirebaseAdmin(false); setIsManualAdmin(false); 
  };
  const handleSaveToCloud = async (charData) => {
    if (!db.current) return;
    const docRef = doc(getHanziCollection(db.current), charData.char);
    const saveData = { ...charData, updatedAt: new Date().toISOString(), updatedBy: user?.email || 'admin' };
    delete saveData.id; await setDoc(docRef, saveData);
    setLastMeta({ volume: charData.volume, lesson: charData.lesson });
  };
  const handleBatchImport = async (dataArray) => {
      if (!db.current) return;
      const batch = writeBatch(db.current);
      const collRef = getHanziCollection(db.current);
      let count = 0;
      dataArray.forEach(item => {
          if (!item.char) return;
          const saveData = { ...item, updatedAt: new Date().toISOString() };
          batch.set(doc(collRef, item.char), saveData);
          count++;
      });
      await batch.commit();
      alert(`Success: ${count}`);
  };
  const handleExport = async () => {
      if (!db.current) return;
      const snapshot = await getDocs(getHanziCollection(db.current));
      const exportData = snapshot.docs.map(doc => { const d = doc.data(); delete d.updatedAt; delete d.updatedBy; return d; });
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `hanzi_backup.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const handleAddCustomWord = async (wordData) => {
      if (!db.current || !user) return;
      setIsCustomAdding(true);
      try { await addDoc(getUserCustomCollection(db.current, user.uid), { ...wordData, createdAt: new Date().toISOString() }); } catch(e) { alert("Save failed"); } finally { setIsCustomAdding(false); }
  };
  const handleDeleteCustomWord = async (id) => { if (!db.current || !user) return; await deleteDoc(doc(getUserCustomCollection(db.current, user.uid), id)); };

  // Game Handlers
  const handleOpenGameSettings = (type) => {
      setPendingGameType(type);
      setIsGameSettingsOpen(true);
  };

  const handleStartGame = (type, settings) => {
      const { count, filterVol, filterLesson, includeCustom, contentType } = settings;
      let items = [...database];
      if (filterVol !== 'all') items = items.filter(i => i.volume === filterVol);
      if (filterLesson !== 'all') items = items.filter(i => i.lesson === filterLesson);
      items = items.sort(() => Math.random() - 0.5).slice(0, count);

      if (includeCustom && customWords.length > 0) {
           const formattedCustom = customWords.map(w => ({ char: w.char, pinyin: w.pinyin, words: [w.char], sentences: [w.sentence], definition: w.definition, isCustom: true }));
           items = [...formattedCustom, ...items];
      }
      if (items.length === 0) { alert("没有找到内容"); return; }
      
      setGameConfig({ type, items, contentType });
      setIsGameSettingsOpen(false);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return [];
    return database.filter(item => item.char.includes(searchTerm) || item.pinyin.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, database]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 pb-20">
      <header className="bg-teal-700 text-white p-4 sticky top-0 z-50 shadow-xl backdrop-blur-md bg-opacity-95">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setAppMode('learn'); setGameConfig(null);}}>
                <BookOpen className="opacity-90" />
                <h1 className="text-xl font-bold hidden sm:block">汉字学习宝</h1>
            </div>
            <div className="flex bg-teal-800/50 rounded-full p-1 ml-4">
                <button onClick={() => { setAppMode('learn'); setGameConfig(null); }} className={`px-4 py-1 rounded-full text-sm font-bold transition ${appMode === 'learn' ? 'bg-white text-teal-700 shadow' : 'text-teal-200 hover:text-white'}`}>学习模式</button>
                <button onClick={() => setAppMode('games')} className={`px-4 py-1 rounded-full text-sm font-bold transition ${appMode === 'games' ? 'bg-white text-teal-700 shadow' : 'text-teal-200 hover:text-white'}`}>游戏练习</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {isAdmin ? (
                 <div className="flex items-center gap-2">
                     <span className={`text-xs px-2 py-1 rounded font-bold shadow-sm hidden md:block ${isManualAdmin ? 'bg-orange-500 text-white' : 'bg-amber-500 text-white'}`}>{isManualAdmin ? "演示" : "管理"}</span>
                     <button onClick={handleExport} className="p-2 bg-teal-600 rounded-lg hover:bg-teal-500" title="导出"><Download size={16} /></button>
                     <button onClick={() => setIsImportModalOpen(true)} className="p-2 bg-indigo-500 rounded-lg hover:bg-indigo-600" title="导入"><UploadCloud size={16} /></button>
                     <button onClick={() => { setEditingChar(null); setIsModalOpen(true); }} className="flex items-center gap-1 bg-white text-teal-700 px-3 py-1.5 rounded-lg font-bold shadow hover:bg-teal-50 text-sm"><PlusCircle size={16} /> 录入</button>
                     <button onClick={handleLogout} className="text-teal-200 hover:text-white p-1"><LogOut size={20}/></button>
                 </div>
             ) : (
                 <div className="flex gap-2">
                    {!user?.isAnonymous && <button onClick={() => setIsCustomModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-800/50 text-teal-200 hover:bg-teal-800 transition"><Crown size={16} /> 我的生词</button>}
                    <button onClick={() => setIsAuthModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-800/50 text-teal-200 hover:bg-teal-800 transition"><User size={16} /> 老师登录</button>
                 </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {appMode === 'games' ? (
            gameConfig ? (
                <div className="h-[80vh] bg-white rounded-3xl shadow-lg border border-slate-200 p-6 overflow-hidden">
                    {gameConfig.type === 'splitMatch' && <SplitWordMatchGame items={gameConfig.items} onBack={() => setGameConfig(null)} />}
                    {gameConfig.type === 'pinyinMatch' && <PinyinMatchGame items={gameConfig.items} onBack={() => setGameConfig(null)} contentType={gameConfig.contentType} />}
                    {gameConfig.type === 'readMatch' && <ReadMatchGame items={gameConfig.items} onBack={() => setGameConfig(null)} />}
                    {gameConfig.type === 'geneMatch' && <GeneMatchGame items={gameConfig.items} onBack={() => setGameConfig(null)} contentType={gameConfig.contentType} />}
                    {gameConfig.type === 'flashcards' && <FlashCardGame items={gameConfig.items} onBack={() => setGameConfig(null)} db={db.current} contentType={gameConfig.contentType} />}
                </div>
            ) : <GameSelector onOpenSettings={handleOpenGameSettings} />
        ) : (
            <>
                <div className="relative group z-40">
                    <input type="text" placeholder="🔍 搜索生字..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowList(true)} className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition shadow-sm text-lg outline-none" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    {showList && searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto z-50">
                        {filteredData.map(item => (
                            <div key={item.id} onClick={() => { setSelectedChar(item); setSearchTerm(""); setShowList(false); }} className="flex items-center p-4 hover:bg-teal-50 cursor-pointer border-b border-gray-50 last:border-0">
                            <span className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-bold mr-4 font-serif">{item.char}</span>
                            <div><div className="font-bold flex items-center gap-2">{item.pinyin}</div><div className="text-xs text-gray-400">Vol {item.volume} • Lesson {item.lesson}</div></div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
                {selectedChar ? (
                    <div className="grid lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="lg:col-span-5">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center sticky top-24">
                                <div className="w-full flex justify-between items-center mb-6">
                                    <h2 className="font-bold text-teal-800 flex items-center gap-2"><PenTool size={18} className="text-teal-600" /> 智能描红</h2>
                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">第{selectedChar.volume}册 / 第{selectedChar.lesson}课</span>
                                </div>
                                <HanziWriterBoard char={selectedChar.char} />
                            </div>
                        </div>
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group">
                                {isAdmin && ( <div className="absolute top-4 right-4 flex gap-2 z-20"><button onClick={() => { setEditingChar(selectedChar); setIsModalOpen(true); }} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 shadow-sm"><Edit3 size={18}/></button></div> )}
                                <div className="relative z-10 flex gap-6">
                                    <div onClick={() => speak(selectedChar.char)} className="w-28 h-28 bg-teal-600 rounded-2xl flex items-center justify-center text-white text-7xl font-serif shadow-xl shadow-teal-100 cursor-pointer hover:scale-105 transition">{selectedChar.char}</div>
                                    <div>
                                        <div className="flex items-baseline gap-3"><h1 className="text-5xl font-bold text-slate-800">{selectedChar.pinyin}</h1><Volume2 onClick={() => speak(selectedChar.char)} className="text-teal-500 cursor-pointer hover:text-teal-600" size={28} /></div>
                                        <p className="text-lg text-slate-500 mt-1 mb-4">{selectedChar.definition || "暂无释义"}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="badge flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm text-slate-600 border border-slate-200"><Layers size={14}/> {selectedChar.structure}</span>
                                            <span className="badge flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm text-slate-600 border border-slate-200"><Type size={14}/> {selectedChar.radical}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* [改进] 通栏卡片式布局：上词下句 */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex-1 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <RefreshCcw className="text-amber-500" size={18}/> 扩展学习
                                    </h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    {selectedChar.words && selectedChar.words.length > 0 ? (
                                        selectedChar.words.map((w, i) => {
                                            const sentence = selectedChar.sentences && selectedChar.sentences[i] ? selectedChar.sentences[i] : "暂无例句";
                                            return (
                                                <div key={i} className="group border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all duration-300 bg-white">
                                                    {/* 上部分：词语 */}
                                                    <div 
                                                        className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center cursor-pointer group-hover:bg-teal-50/50 transition-colors" 
                                                        onClick={() => speak(w)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="bg-teal-600 text-white text-xs font-bold px-2 py-0.5 rounded">词语</span>
                                                            <span className="text-xl font-bold text-slate-800 tracking-wide">{w}</span>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-teal-500 hover:bg-teal-500 hover:text-white transition shadow-sm">
                                                            <Volume2 size={16} />
                                                        </div>
                                                    </div>
                                                    {/* 下部分：例句 */}
                                                    <div 
                                                        className="p-5 cursor-pointer relative" 
                                                        onClick={() => speak(sentence)}
                                                    >
                                                        <div className="absolute top-5 left-5 text-gray-300 select-none">
                                                            <span className="text-4xl leading-none">“</span>
                                                        </div>
                                                        <p className="text-slate-600 leading-relaxed text-base pl-8 pr-2 pt-1 font-medium">
                                                            {sentence}
                                                        </p>
                                                        <div className="mt-2 pl-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-xs text-teal-500 font-bold flex items-center gap-1"><Volume2 size={12}/> 点击朗读例句</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : ( 
                                        <div className="text-center text-gray-400 py-12 flex flex-col items-center gap-2">
                                            <BookOpen size={32} className="opacity-20"/>
                                            <span>暂无扩展内容</span>
                                        </div> 
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-96 text-gray-400 gap-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center"><Cloud size={40} className="text-slate-300" /></div>
                        <div className="text-center"><h3 className="text-lg font-bold text-gray-500">开始学习</h3><p className="text-sm">搜索或从数据库中选择汉字</p></div>
                    </div>
                )}
            </>
        )}

        <AdminCharacterForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveToCloud} database={database} initialData={editingChar} lastMeta={lastMeta} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={handleLogin} isProcessing={isProcessingAuth} />
        <CustomWordsModal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} customWords={customWords} onAdd={handleAddCustomWord} onDelete={handleDeleteCustomWord} isAdding={isCustomAdding} />
        <ImportJsonModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleBatchImport} />
        <GameSettingsModal 
            isOpen={isGameSettingsOpen} 
            onClose={() => setIsGameSettingsOpen(false)} 
            onStart={handleStartGame} 
            database={database} 
            userRole={user ? (ADMIN_EMAILS.includes(user.email) ? 'admin' : 'member') : 'visitor'} 
            hasCustomWords={customWords.length > 0} 
            gameType={pendingGameType} 
        />
        
        <div className="text-center text-slate-400 text-sm py-6">© 2023 汉字学习宝 • Learning & Games v2.6</div>
      </main>
    </div>
  );
}