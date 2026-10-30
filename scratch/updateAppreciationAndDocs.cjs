const fs = require('fs');
const path = require('path');

// 1. AppreciationPage.jsx
{
  const p = path.resolve('src/modules/hr/pages/AppreciationPage.jsx');
  let c = fs.readFileSync(p, 'utf8');

  c = c.replace(
    'className="flex items-center justify-between flex-wrap gap-2.5 bg-white p-3 px-4 rounded-[10px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0"',
    'className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0"'
  );
  c = c.replace(
    'className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"',
    'className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center"'
  );
  c = c.replace(
    'className="m-0 text-[15px] font-extrabold text-slate-900"',
    'className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100"'
  );
  c = c.replace(
    'className="text-[10.5px] py-px px-1.5 rounded bg-amber-100 text-amber-800 font-bold"',
    'className="text-[10.5px] py-px px-1.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold"'
  );
  c = c.replace(
    'className="m-0 mt-px text-[11.5px] text-slate-500"',
    'className="m-0 mt-px text-[11.5px] text-slate-500 dark:text-slate-400"'
  );
  c = c.replace(
    'className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-white text-blue-600 border border-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors"',
    'className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"'
  );
  c = c.replace(
    'className="kpi-value text-slate-900 text-[17px]"',
    'className="kpi-value text-slate-900 dark:text-slate-100 text-[17px]"'
  );
  c = c.replace(
    'className="bg-white rounded-[10px] border border-slate-200 py-2 px-3 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"',
    'className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 py-2 px-3 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"'
  );
  c = c.replace(
    'className="flex items-center gap-1.5 text-xs text-slate-500"',
    'className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"'
  );
  c = c.replace(
    'className="h-[30px] px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-900 outline-none cursor-pointer"',
    'className="h-[30px] px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none cursor-pointer"'
  );
  c = c.replace(
    'className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 bg-slate-50 min-w-[240px]"',
    'className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-w-[240px]"'
  );
  c = c.replace(
    'className="border-none bg-transparent outline-none text-xs w-full text-slate-900"',
    'className="border-none bg-transparent outline-none text-xs w-full text-slate-900 dark:text-slate-100"'
  );
  c = c.replace(
    'className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md"',
    'className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-md"'
  );
  c = c.replace(
    "viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'",
    "viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
  );
  c = c.replace(
    "viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'",
    "viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
  );

  fs.writeFileSync(p, c, 'utf8');
  console.log('AppreciationPage.jsx updated');
}

// 2. DocumentationPage.jsx
{
  const p = path.resolve('src/modules/hr/pages/DocumentationPage.jsx');
  let c = fs.readFileSync(p, 'utf8');

  c = c.replace(
    'className="flex flex-col items-center justify-center p-[60px_20px] text-center bg-white rounded-xl border border-slate-200 my-6 mx-auto max-w-[540px]"',
    'className="flex flex-col items-center justify-center p-[60px_20px] text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 my-6 mx-auto max-w-[540px]"'
  );
  c = c.replace(
    'className="text-lg font-extrabold text-slate-900 m-0 mb-2"',
    'className="text-lg font-extrabold text-slate-900 dark:text-slate-100 m-0 mb-2"'
  );
  c = c.replace(
    'className="text-[13.5px] text-slate-500 leading-normal m-0 mb-4"',
    'className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-normal m-0 mb-4"'
  );

  c = c.replace(
    'className="flex items-center justify-between flex-wrap gap-2.5 bg-white p-3 px-4 rounded-[10px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0"',
    'className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0"'
  );
  c = c.replace(
    'className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"',
    'className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center"'
  );
  c = c.replace(
    'className="m-0 text-base font-extrabold text-slate-900 leading-tight"',
    'className="m-0 text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight"'
  );
  c = c.replace(
    'className="m-0 mt-px text-[11.5px] text-slate-500"',
    'className="m-0 mt-px text-[11.5px] text-slate-500 dark:text-slate-400"'
  );

  c = c.replaceAll(
    'className="bg-white rounded-[10px] p-[10px_14px] border border-slate-200 flex items-center justify-between"',
    'className="bg-white dark:bg-slate-900 rounded-[10px] p-[10px_14px] border border-slate-200 dark:border-slate-800 flex items-center justify-between"'
  );
  c = c.replaceAll(
    'className="text-[11px] font-semibold text-slate-500"',
    'className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"'
  );
  c = c.replace(
    'className="text-lg font-extrabold text-slate-900 mt-0.5"',
    'className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5"'
  );

  c = c.replace(
    'className="bg-white rounded-[10px] border border-slate-200 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]"',
    'className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]"'
  );
  c = c.replace(
    'className="p-2 px-3 border-b border-slate-100 flex items-center justify-between gap-2.5 flex-wrap"',
    'className="p-2 px-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5 flex-wrap"'
  );
  c = c.replace(
    'className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 bg-slate-50 w-60"',
    'className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-60"'
  );
  c = c.replace(
    'className="border-none bg-transparent outline-none text-xs w-full text-slate-900"',
    'className="border-none bg-transparent outline-none text-xs w-full text-slate-900 dark:text-slate-100"'
  );
  c = c.replace(
    'className="h-[30px] px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-900 outline-none"',
    'className="h-[30px] px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"'
  );

  fs.writeFileSync(p, c, 'utf8');
  console.log('DocumentationPage.jsx updated');
}

// 3. UploadDocumentModal.jsx
{
  const p = path.resolve('src/modules/hr/components/documents/UploadDocumentModal.jsx');
  let c = fs.readFileSync(p, 'utf8');

  c = c.replace(
    'className="bg-white rounded-2xl w-full max-w-[520px] shadow-[0_20px_40px_rgba(0,0,0,0.2)] overflow-hidden"',
    'className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[520px] shadow-[0_20px_40px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-800 overflow-hidden"'
  );
  c = c.replace(
    'className="w-full py-[9px] px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 outline-none bg-white"',
    'className="w-full py-[9px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800"'
  );
  c = c.replace(
    'className="w-full py-[9px] px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 outline-none bg-white"',
    'className="w-full py-[9px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800"'
  );
  c = c.replace(
    'className="py-[9px] px-4 rounded-lg border border-slate-300 bg-white text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50"',
    'className="py-[9px] px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"'
  );

  fs.writeFileSync(p, c, 'utf8');
  console.log('UploadDocumentModal.jsx updated');
}

