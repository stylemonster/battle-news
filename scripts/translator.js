/**
 * 翻译函数模块
 */

function translate(text) {
    if (!text) return '';
    
    let result = text;
    
    // 短语翻译 (优先处理)
    const phrases = [
        ['The situation remains tense', '局势仍然紧张'],
        ['both sides continue to deploy troops', '双方继续部署军队'],
        ['heavy fighting', '激战'],
        ['in the eastern Donbas region', '在东部顿巴斯地区'],
        ['after rocket fire', '火箭弹袭击后'],
        ['long-standing conflict', '长期冲突'],
        ['all options remain on the table', '所有选项都在考虑范围内'],
        ['a critical point', '关键点'],
        ['defense ministers met', '国防部长开会'],
        ['discuss increasing military support', '讨论增加军事支持'],
        ['amid ongoing conflict', '在持续冲突中'],
        ['new aid packages', '新援助计划'],
        ['are preparing defensive positions', '正在准备防御阵地'],
        ['military officials', '军事官员'],
        ['continued Russian advances', '俄罗斯持续推进'],
        ['Russian military', '俄罗斯军方'],
        ['new offensive operation', '新攻势行动'],
        ['Ukrainian forces', '乌克兰军队'],
        ['Palestinian militants', '巴勒斯坦武装分子'],
        ['The exchange marks another escalation', '这次交火标志着又一次升级'],
        ['International negotiations', '国际谈判'],
        ['NATO allies', '北约盟国'],
        ['defense ministers', '国防部长'],
        ['increasing military support', '增加军事支持'],
        ['Several new aid packages', '几个新援助计划'],
        ['nuclear program', '核计划'],
    ];
    
    for (const [en, zh] of phrases) {
        result = result.replace(new RegExp(en, 'gi'), zh);
    }
    
    // 单词翻译
    const words = {
        'Ukraine': '乌克兰', 'Ukrainian': '乌克兰',
        'Russia': '俄罗斯', 'Russian': '俄罗斯',
        'Iran': '伊朗', 'Iranian': '伊朗',
        'US': '美国', 'America': '美国', 'American': '美国', 'United States': '美国',
        'Israel': '以色列', 'Israeli': '以色列',
        'Gaza': '加沙', 'Gaza strip': '加沙地带', 'Palestinian': '巴勒斯坦',
        'Hamas': '哈马斯',
        'NATO': '北约',
        'Europe': '欧洲', 'European': '欧洲',
        'Middle East': '中东',
        'Donbas': '顿巴斯', 'Avdiivka': '阿夫季夫卡', 'Bakhmut': '巴赫穆特',
        'Tehran': '德黑兰', 'Kremlin': '克里姆林宫',
        'military': '军事', 'forces': '军队', 'army': '军队',
        'war': '战争', 'conflict': '冲突', 'battle': '战斗',
        'troops': '部队', 'soldiers': '士兵',
        'airstrikes': '空袭', 'airstrike': '空袭',
        'strike': '袭击', 'attack': '袭击', 'attacks': '袭击',
        'offensive': '攻势', 'operation': '行动',
        'defensive': '防御', 'defense': '国防', 'security': '安全',
        'weapon': '武器', 'nuclear': '核', 'missile': '导弹',
        'drone': '无人机', 'rocket': '火箭弹', 'rockets': '火箭弹',
        'government': '政府', 'president': '总统', 'minister': '部长',
        'official': '官员', 'officials': '官员',
        'Putin': '普京', 'Zelensky': '泽连斯基', 'Netanyahu': '内塔尼亚胡', 'Biden': '拜登',
        'advance': '推进', 'advances': '推进',
        'retreat': '撤退', 'deploy': '部署', 'deployment': '部署',
        'ceasefire': '停火', 'negotiation': '谈判', 'negotiations': '谈判',
        'sanctions': '制裁',
        'report': '报道', 'reported': '报道', 'reports': '报道', 'reportedly': '据报道',
        'announce': '宣布', 'announced': '宣布', 'announces': '宣布',
        'warn': '警告', 'warned': '警告', 'warns': '警告',
        'conducts': '执行', 'conducted': '执行',
        'new': '新', 'ongoing': '持续', 'continued': '持续',
        'eastern': '东部', 'western': '西部', 'northern': '北部', 'southern': '南部',
        'region': '地区', 'area': '地区',
        'say': '表示', 'said': '表示', 'says': '表示', 'saying': '表示',
        'following': '之后', 'remain': '保持', 'remains': '保持',
        'tense': '紧张', 'heavy': '激烈',
        'support': '支持', 'aid': '援助', 'peace': '和平',
        'talks': '会谈', 'summit': '峰会',
        'according': '根据', 'against': '反对', 'further': '进一步',
        'critical': '关键', 'point': '点',
        'options': '选项', 'international': '国际',
        'reached': '达成', 'reach': '达成',
        'program': '计划', 'escalation': '升级',
        'overnight': '连夜', 'militants': '武装分子',
        'exchange': '交火', 'marks': '标志', 'another': '又一次',
        'several': '几个', 'packages': '计划',
        'preparing': '准备', 'positions': '阵地',
        'Reuters': '路透社', 'BBC': 'BBC', 'CNN': 'CNN',
        'Al Jazeera': '半岛电视台', 'NYT': '纽约时报',
        // 介词和虚词
        'with': '', 'without': '', 'the': '', 'a': '', 'an': '',
        'and': '和', 'or': '或', 'but': '',
        'is': '', 'are': '', 'was': '', 'were': '', 'has': '', 'have': '', 'had': '',
        'to': '', 'for': '', 'from': '', 'by': '', 'on': '', 'at': '', 'in': '', 'of': '',
        'as': '', 'that': '', 'which': '', 'this': '', 'these': '', 'those': '',
        'its': '', 'their': '', 'his': '', 'her': '',
        'it': '', 'they': '', 'we': '', 'you': '',
        'not': '', 'no': '',
        'all': '所有', 'both': '双方',
    };
    
    for (const [en, zh] of Object.entries(words)) {
        if (zh === '') {
            result = result.replace(new RegExp('\\b' + en + '\\b', 'gi'), '');
        } else {
            result = result.replace(new RegExp('\\b' + en + '\\b', 'gi'), zh);
        }
    }
    
    // 清理
    result = result.replace(/\s+/g, ' ').trim();
    return result;
}

module.exports = { translate };
