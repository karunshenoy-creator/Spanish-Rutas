
// Spanish - Rutas y Palabras (fresh build)
// Deterministic daily content seeded by day number

const BEEP = new Audio('data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAaW1hZ2VkaXRpbmcuLi4=');

const state = {
  day: 1,
  data: null,
  rng: (seed)=>{ // Mulberry32
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ t >>> 15, 1 | t);
      r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    }
  }
};

async function loadData(){
  const res = await fetch('./data.json');
  state.data = await res.json();
}

function pickN(arr, n, rnd){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(rnd()* (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.max(0,Math.min(n,a.length)));
}

function renderDay(){
  const rnd = state.rng(state.day*100003);
  const container = document.getElementById('content');
  container.innerHTML = '';

  // --- Vocabulary (6 terms)
  const vocab = pickN(state.data.vocab, 6, rnd);
  const vocabCard = document.createElement('div');
  vocabCard.className = 'card';
  vocabCard.innerHTML = `<div class="section-title">Vocabulary</div><div class="stack" id="vocabStack"></div>`;
  container.appendChild(vocabCard);
  const vs = document.getElementById('vocabStack');
  vocab.forEach(item => {
    const row = document.createElement('div');
    row.className='flashcard';
    row.innerHTML = \`
      <div class="term">\${item.es}</div>
      <button class="btn translate">Translate</button>
      <div class="small en" style="display:none">\${item.en}</div>
    \`;
    row.querySelector('.translate').addEventListener('click', ()=>{
      row.querySelector('.en').style.display='block';
    });
    vs.appendChild(row);
  });

  // --- Cultural Quiz (3-5 Qs)
  const qCount = 3 + Math.floor(rnd()*3); // 3–5
  const questions = [];
  // 1) vocab MC
  const vq = pickN(state.data.vocab, 1, rnd)[0];
  if (vq){
    const opts = pickN(state.data.vocab.filter(x=>x!==vq).map(x=>x.en), 3, rnd);
    opts.push(vq.en);
    // shuffle options
    const sh = pickN(opts, opts.length, rnd);
    questions.push({
      kind:'mc',
      prompt:`What does "${vq.es}" mean?`,
      answer:vq.en,
      options:sh
    });
  }
  // 2) flag question
  const ctry = pickN(state.data.countries, 1, rnd)[0];
  if (ctry){
    const opts = pickN(state.data.countries.filter(x=>x!==ctry).map(x=>x.name), 3, rnd);
    opts.push(ctry.name);
    const sh = pickN(opts, opts.length, rnd);
    questions.push({
      kind:'flag',
      prompt:'Which country does this flag belong to?',
      answer: ctry.name,
      flag: `./flags/\${ctry.flag}`,
      options: sh
    });
  }
  // 3) local food
  const foodC = pickN(state.data.countries, 1, rnd)[0];
  if (foodC){
    const opts = pickN(state.data.countries.filter(x=>x!==foodC).map(x=>x.food), 3, rnd);
    opts.push(foodC.food);
    const sh = pickN(opts, opts.length, rnd);
    questions.push({
      kind:'mc',
      prompt:`Which is a specialty from \${foodC.name}?`,
      answer: foodC.food,
      options: sh
    });
  }
  // 4) custom true/false
  const cust = pickN(state.data.countries, 1, rnd)[0];
  if (cust){
    const truth = rnd() > 0.5;
    const wrong = pickN(state.data.countries.filter(x=>x!==cust), 1, rnd)[0];
    questions.push({
      kind:'tf',
      prompt: truth ? \`A common custom in \${cust.name} is: "\${cust.custom}".\`
                   : \`A common custom in \${cust.name} is: "\${wrong.custom}".\`,
      answer: truth ? 'True' : 'False',
      options: ['True','False']
    });
  }
  // 5) capital MC
  const capC = pickN(state.data.countries, 1, rnd)[0];
  if (capC){
    const opts = pickN(state.data.countries.filter(x=>x!==capC).map(x=>x.capital), 3, rnd);
    opts.push(capC.capital);
    const sh = pickN(opts, opts.length, rnd);
    questions.push({
      kind:'mc',
      prompt:`What is the capital of \${capC.name}?`,
      answer: capC.capital,
      options: sh
    });
  }
  // trim to qCount
  while (questions.length > qCount) questions.pop();

  const quizCard = document.createElement('div');
  quizCard.className='card';
  quizCard.innerHTML = \`
    <div class="section-title">Cultural Quiz</div>
    <div id="quizArea"></div>
    <div class="hr"></div>
    <div class="small">3–5 questions daily — flags, food, customs, capitals & vocab.</div>
  \`;
  container.appendChild(quizCard);

  const qa = document.getElementById('quizArea');
  let score = 0, seen = 0;
  questions.forEach((q, idx)=>{
    const qWrap = document.createElement('div');
    qWrap.className='stack';
    const title = document.createElement('div');
    title.className='question';
    title.textContent = (idx+1) + '. ' + q.prompt;
    qWrap.appendChild(title);
    if (q.kind==='flag'){
      const img = document.createElement('img');
      img.className='flag';
      img.src = q.flag;
      img.alt = 'flag';
      qWrap.appendChild(img);
    }
    const choices = document.createElement('div');
    choices.className='choices';
    q.options.forEach(opt=>{
      const btn = document.createElement('button');
      btn.className='choice';
      btn.textContent = opt;
      btn.addEventListener('click', ()=>{
        if (btn.dataset.locked) return;
        btn.dataset.locked = '1';
        const correct = opt === q.answer;
        btn.classList.add(correct ? 'correct' : 'wrong');
        if (correct) score++;
        seen++;
        if (seen === questions.length){
          const res = document.createElement('div');
          res.innerHTML = `<div class="section-title">Score: \${score} / \${questions.length}</div>`;
          qa.appendChild(res);
        }
      });
      choices.appendChild(btn);
    });
    qWrap.appendChild(choices);
    qa.appendChild(qWrap);
  });

  // --- Listen & Speak (listen-only friendly)
  const listen = document.createElement('div');
  listen.className='card';
  const sentences = [
    "Hola. ¿Cómo estás?",
    "Quisiera un café, por favor.",
    "¿Dónde está la estación de autobuses?",
    "Me gusta aprender español."
  ];
  // use 3–4 sentences
  const count = 3 + Math.floor(rnd()*2);
  const subset = sentences.slice(0, count);
  listen.innerHTML = \`
    <div class="section-title">Listen & Speak</div>
    <div class="stack" id="listenList"></div>
    <div class="hr"></div>
    <div class="small">Tap ▶ to hear each sentence. Speaking is optional if your microphone isn't set up.</div>
  \`;
  container.appendChild(listen);
  const ll = document.getElementById('listenList');
  subset.forEach(line=>{
    const row = document.createElement('div');
    row.className='flashcard';
    row.innerHTML = \`
      <div>\${line}</div>
      <button class="btn">▶ Play</button>
    \`;
    row.querySelector('.btn').addEventListener('click', ()=>{
      try {
        const u = new SpeechSynthesisUtterance(line);
        u.lang = 'es-ES';
        speechSynthesis.speak(u);
      } catch(e){}
    });
    ll.appendChild(row);
  });
}

function initUI(){
  const tiles = document.getElementById('dayTiles');
  tiles.innerHTML = '';
  for (let i=1;i<=31;i++){
    const b = document.createElement('button');
    b.className='day-tile';
    b.textContent = i;
    b.addEventListener('click', ()=>{
      state.day = i;
      document.querySelectorAll('.day-tile').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      try{ BEEP.currentTime=0; BEEP.play(); }catch(e){}
      renderDay();
    });
    tiles.appendChild(b);
  }
  // default select day 1
  tiles.firstElementChild.click();
}

window.addEventListener('DOMContentLoaded', async ()=>{
  await loadData();
  initUI();
});
