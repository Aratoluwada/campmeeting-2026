import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import { ArrowRight, Calendar, Camera, Check, Clock, Download, ImagePlus, LoaderCircle, MapPin, Menu, MessageCircle, Plus, RotateCcw, Share2, Upload, X } from 'lucide-react';
import './App.css';

const TEMPLATE_URL = '/assets/attendance-template.svg';
const LOGO_URL = '/assets/chci-logo.png';
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1397;
const PHOTO_FRAME = { x: 350, y: 540, width: 380, height: 360 };
const NAME_FRAME = { x: 275, y: 915, width: 537, height: 77 };
// Day 1, morning session: 6 AM West Africa Time (UTC+1)
const EVENT_START = new Date('2026-10-21T06:00:00+01:00').getTime();

const NAV_LINKS = [
  { href: '#details', label: 'Details' },
  { href: '#create', label: 'Get your DP' },
  { href: '#faq', label: 'FAQ' },
];

const FAQ = [
  { q: 'Is it free to use?', a: 'Yes. Creating and downloading your attendance design is completely free.' },
  { q: 'Does my photo get uploaded anywhere?', a: 'No. Your photo is processed in your browser only. It is never sent to a server or saved in a database.' },
  { q: 'What do I get at the end?', a: 'A high-resolution PNG (1080 × 1397) with your photo and first name, ready for WhatsApp, Instagram or your gallery.' },
  { q: 'How do I share it?', a: 'Tap Share design to use your phone’s share sheet, or download the PNG and post it yourself. There is also a prewritten WhatsApp message to invite friends.' },
  { q: 'Can I change my photo after adding it?', a: 'Yes. Use Adjust to re-crop it, or Change to pick a different photo, then generate your design again.' },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function makeCropImage(imageSrc, pixelCrop) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));
  const context = canvas.getContext('2d');
  context.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function roundedImage(context, image, x, y, width, height, radius) {
  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.clip();
  context.drawImage(image, x, y, width, height);
  context.restore();
}

async function renderDesign(photoUrl, firstName) {
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext('2d');
  const background = await loadImage(TEMPLATE_URL);
  context.drawImage(background, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  if (photoUrl) {
    const photo = await loadImage(photoUrl);
    roundedImage(context, photo, PHOTO_FRAME.x, PHOTO_FRAME.y, PHOTO_FRAME.width, PHOTO_FRAME.height, 38);
  }

  const name = firstName.trim();
  if (name) {
    context.save();
    context.fillStyle = '#15162f';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    let fontSize = 43;
    context.font = `800 ${fontSize}px Arial, sans-serif`;
    while (context.measureText(name).width > NAME_FRAME.width - 38 && fontSize > 20) {
      fontSize -= 1;
      context.font = `800 ${fontSize}px Arial, sans-serif`;
    }
    context.fillText(name, NAME_FRAME.x + NAME_FRAME.width / 2, NAME_FRAME.y + NAME_FRAME.height / 2 + 1, NAME_FRAME.width - 36);
    context.restore();
  }
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the image. Please try again.')), 'image/png'));
}

function attendanceMessage(name) {
  const greeting = name?.trim() ? `${name.trim()} is attending` : 'I am attending';
  return `${greeting} Homecoming & Campmeeting 2026 at City Harvest Church International 🙌!\n\nOur theme is “The Wonderful God”. Join us from October 21–25, 2026, at Transformation Center, Somorin, Abeokuta.\n\nMorning sessions: 6AM | Evening sessions: 5PM\n\nCome and experience God's goodness with us!\n#HomecomingAndCampmeeting2026 #TheWonderfulGod`;
}

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    live: now >= target,
    days: Math.floor(diff / 86400000),
    hours: Math.floor(diff / 3600000) % 24,
    minutes: Math.floor(diff / 60000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

function Countdown() {
  const { live, days, hours, minutes, seconds } = useCountdown(EVENT_START);
  if (live) return <div className="countdown-live"><span className="live-dot" /> Homecoming &amp; Campmeeting 2026 is happening now.</div>;
  const units = [['Days', days], ['Hours', hours], ['Minutes', minutes], ['Seconds', seconds]];
  return (
    <div className="countdown" role="timer" aria-label="Time until Homecoming and Campmeeting 2026 begins">
      {units.map(([label, value]) => (
        <div className="count-box" key={label}>
          <strong>{String(value).padStart(2, '0')}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function Ticker() {
  const items = ['HOMECOMING & CAMPMEETING 2026', 'THE WONDERFUL GOD', 'OCT 21–25', 'ABEOKUTA', 'I WILL BE ATTENDING'];
  const row = items.map((item) => <span key={item}>{item}<i aria-hidden="true">✦</i></span>);
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track"><div className="ticker-row">{row}</div><div className="ticker-row">{row}</div></div>
    </div>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [sourcePhoto, setSourcePhoto] = useState('');
  const [croppedPhoto, setCroppedPhoto] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.25);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [designBlob, setDesignBlob] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const photoPreview = croppedPhoto || '';
  const designUrl = useMemo(() => designBlob ? URL.createObjectURL(designBlob) : '', [designBlob]);

  useEffect(() => () => { if (designUrl) URL.revokeObjectURL(designUrl); }, [designUrl]);
  useEffect(() => {
    if (!sourcePhoto) return;
    setCropOpen(true);
  }, [sourcePhoto]);

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  function handleFile(event) {
    setError('');
    setSuccess('');
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file, such as JPG, PNG, or WebP.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('That image is larger than 15 MB. Please choose a smaller photo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSourcePhoto(String(reader.result));
      setCrop({ x: 0, y: 0 });
      setZoom(1.25);
    };
    reader.onerror = () => setError('We could not read that photo. Please try another one.');
    reader.readAsDataURL(file);
  }

  async function applyCrop() {
    if (!sourcePhoto || !croppedAreaPixels) return;
    try {
      const image = await makeCropImage(sourcePhoto, croppedAreaPixels);
      setCroppedPhoto(image);
      setDesignBlob(null);
      setCropOpen(false);
      setSourcePhoto('');
      setSuccess('Photo added. You can still change it or adjust the crop.');
    } catch {
      setError('We could not crop that photo. Please try another image.');
    }
  }

  async function generateDesign() {
    setError('');
    setSuccess('');
    if (!firstName.trim()) {
      setError('Enter your first name to personalize your design.');
      return;
    }
    if (!croppedPhoto) {
      setError('Upload and position your photo before generating the design.');
      return;
    }
    setIsGenerating(true);
    try {
      const blob = await renderDesign(croppedPhoto, firstName);
      setDesignBlob(blob);
      setSuccess('Your attendance design is ready! Download it or share it with friends.');
    } catch (err) {
      setError(err?.message || 'Something went wrong while generating the design.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function downloadDesign() {
    if (!designBlob) return;
    const url = URL.createObjectURL(designBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `homecoming-2026-${firstName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'attendance'}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // Shares the design image, optionally together with the invite message.
  async function shareDesign({ withMessage = false } = {}) {
    if (!designBlob) return;
    setError('');
    const message = attendanceMessage(firstName);
    const file = new File([designBlob], `homecoming-2026-${firstName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'attendance'}.png`, { type: 'image/png' });
    const shareData = { files: [file], title: 'Homecoming & Campmeeting 2026' };
    if (withMessage) shareData.text = message;

    // Some apps drop the text when an image is attached, so keep a copy on the clipboard as a backup.
    if (withMessage) { try { await navigator.clipboard?.writeText(message); } catch { /* clipboard unavailable */ } }

    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share(shareData);
        return;
      }
      // Browsers without file sharing (most desktops): save the image, and open WhatsApp with the text.
      await downloadDesign();
      if (withMessage) {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
        setSuccess('Image downloaded. Attach it to the WhatsApp chat that just opened. The message is already filled in.');
      } else {
        setSuccess('Image downloaded. Attach it to your post or message to share it.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Sharing was not available. Download the image and share it from your gallery.');
    }
  }

  function startAgain() {
    setFirstName(''); setSourcePhoto(''); setCroppedPhoto(''); setDesignBlob(null); setError(''); setSuccess('');
    document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      <a className="skip-link" href="#create">Skip to the card creator</a>

      <header className="navbar">
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label="City Harvest Church International, home">
            <img src={LOGO_URL} alt="" className="brand-logo" width="34" height="56" />
            <span className="brand-text"><strong>City Harvest</strong><small>Church International</small></span>
          </a>
          <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main">
            {NAV_LINKS.map((link) => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
            <a className="nav-cta mobile-only" href="#create" onClick={() => setMenuOpen(false)}>Create my card</a>
          </nav>
          <a className="nav-cta desktop-only" href="#create">Create my card <ArrowRight size={16} /></a>
          <button className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="chip">Oct 21–25, 2026 · Abeokuta</span>
            <h1>Homecoming <span className="amp">&amp;</span> Campmeeting <span className="year">2026.</span></h1>
            <p className="hero-sub">Our theme this year is <strong>The Wonderful God</strong>. Make your personalized “I will be attending” card, share it, and invite someone to come with you.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#create">Create my card <ArrowRight size={19} /></a>
              <a className="btn btn-ghost" href="#details">See the details</a>
            </div>
            <div className="privacy-note"><span className="privacy-dot" /> Free to use. Your photo stays on your device.</div>
          </div>
          <div className="hero-art" aria-label="Preview of an attendance card">
            <div className="art-blob" />
            <div className="mini-card">
              <div className="mini-card-top">I WILL BE<br />ATTENDING!</div>
              <div className="mini-photo"><Camera size={44} strokeWidth={1.4} /></div>
              <div className="mini-name">YOUR NAME</div>
              <div className="mini-event">HOMECOMING &amp; CAMPMEETING 2026</div>
              <div className="mini-theme">THE WONDERFUL GOD</div>
            </div>
            <span className="spark spark-one">✦</span><span className="spark spark-two">✧</span>
          </div>
        </section>

        <Ticker />

        <section className="countdown-section" aria-labelledby="countdown-title">
          <div className="section-head center">
            <span className="eyebrow">Counting down</span>
            <h2 id="countdown-title">Until we gather.</h2>
          </div>
          <Countdown />
        </section>

        <section className="details" id="details" aria-labelledby="details-title">
          <div className="section-head">
            <span className="eyebrow">Plan your visit</span>
            <h2 id="details-title">The details.</h2>
          </div>
          <div className="card-grid">
            <article className="info-card">
              <span className="info-icon"><Calendar size={22} /></span>
              <h3>When</h3>
              <p className="info-big">October 21–25, 2026</p>
              <p>Five days of worship, the Word and fellowship.</p>
            </article>
            <article className="info-card">
              <span className="info-icon"><Clock size={22} /></span>
              <h3>Sessions</h3>
              <p className="info-big">6 AM · 5 PM</p>
              <p>Morning sessions at 6 AM and evening sessions at 5 PM.</p>
            </article>
            <article className="info-card">
              <span className="info-icon"><MapPin size={22} /></span>
              <h3>Where</h3>
              <p className="info-big">Transformation Center</p>
              <p>Somorin, Abeokuta.</p>
            </article>
          </div>
        </section>

        <section className="builder" id="create" aria-labelledby="builder-title">
          <div className="section-head">
            <span className="eyebrow">Get your DP</span>
            <h2 id="builder-title">Make it yours.</h2>
            <p>Just your first name and a photo. That’s all you need.</p>
          </div>
          <div className="builder-grid">
            <div className="form-panel">
              <label className="field-label" htmlFor="first-name">Your first name</label>
              <input id="first-name" className="name-input" value={firstName} onChange={(event) => { setFirstName(event.target.value.slice(0, 32)); setDesignBlob(null); }} placeholder="e.g. Toluwade" maxLength={32} autoComplete="given-name" />
              <div className="field-meta"><span>This is how your name will appear on the design.</span><span>{firstName.length}/32</span></div>

              <div className="field-label photo-label">Your photograph</div>
              {croppedPhoto ? <div className="uploaded-row"><img src={croppedPhoto} alt="Your selected portrait" /><div className="uploaded-copy"><strong>Photo ready</strong><span>Looks good? You can still adjust it.</span></div><button type="button" className="text-button" onClick={() => { setSourcePhoto(croppedPhoto); setCrop({ x: 0, y: 0 }); setZoom(1); setCroppedAreaPixels(null); }}>Adjust</button><label className="text-button change-photo">Change<input type="file" accept="image/*" onChange={handleFile} /></label></div> : <label className="upload-box"><input type="file" accept="image/*" onChange={handleFile} /><span className="upload-icon"><ImagePlus size={25} /></span><strong>Upload a photo</strong><span>JPG, PNG or WebP · Up to 15 MB</span><span className="upload-action"><Upload size={16} /> Choose photo</span></label>}
              <div className="tip-box"><span className="tip-icon">✦</span><p><strong>Quick tip</strong><br />Choose a clear photo with your face visible. You can zoom and move it around in the next step.</p></div>
              {error && <p className="feedback error" role="alert">{error}</p>}
              {success && <p className="feedback success" role="status">{success}</p>}
              <button className="btn btn-primary full-button" onClick={generateDesign} disabled={isGenerating}>{isGenerating ? <><LoaderCircle className="spin" size={19} /> Creating your design…</> : <>Generate my design <ArrowRight size={19} /></>}</button>
              <button className="back-button" onClick={startAgain}>Start over</button>
            </div>

            <div className="preview-panel">
              <div className="preview-label"><span className="live-dot" /> <span>LIVE PREVIEW</span> <small>Updates as you type</small></div>
              <div className="poster-preview">
                <img className="poster-background" src={TEMPLATE_URL} alt="Homecoming and Campmeeting 2026 attendance design background" />
                {photoPreview && <img className="poster-person" src={photoPreview} alt="Your photo in the attendance card" />}
                <div className={`poster-name ${firstName.trim().length > 17 ? 'long-name' : ''}`}>{firstName.trim() || 'YOUR NAME'}</div>
              </div>
              <p className="preview-caption"><Check size={15} /> Your photo and name are added to the design in your browser.</p>
            </div>
          </div>

          {designUrl && <div className="result-panel">
            <div className="result-heading"><span className="result-check"><Check size={20} /></span><div><h3>Your design is ready!</h3><p>It’s time to spread the word and invite someone along.</p></div></div>
            <img className="final-design" src={designUrl} alt="Your completed Homecoming and Campmeeting attendance design" />
            <div className="result-actions"><button className="btn btn-primary" onClick={downloadDesign}><Download size={18} /> Download PNG</button><button className="btn btn-dark" onClick={() => shareDesign()}><Share2 size={18} /> Share design</button><button className="btn btn-green" onClick={() => shareDesign({ withMessage: true })}><MessageCircle size={18} /> Share message</button></div>
            <p className="share-hint"><strong>Share message</strong> sends your design together with the invite text. <strong>Share design</strong> sends just the image.</p>
            <button className="back-button" onClick={startAgain}>Create another design</button>
          </div>}
        </section>

        <section className="faq" id="faq" aria-labelledby="faq-title">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2 id="faq-title">Good to know.</h2>
          </div>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details className="faq-item" key={item.q}>
                <summary>{item.q}<Plus size={20} aria-hidden="true" /></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="closing">
          <div className="closing-inner">
            <h2>Don’t come alone.</h2>
            <p>Make your card, share it, and bring someone with you to encounter The Wonderful God.</p>
            <a className="btn btn-primary" href="#create">Create my card <ArrowRight size={19} /></a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand"><img src={LOGO_URL} alt="" width="34" height="56" /><span>Made by the media team of <strong>City Harvest Church International</strong></span></div>
          <span className="footer-tag">HOMECOMING &amp; CAMPMEETING 2026 · OCT 21–25</span>
        </div>
      </footer>

      {cropOpen && sourcePhoto && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCropOpen(false); setSourcePhoto(''); } }}>
        <section className="crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title">
          <div className="modal-header"><div><span className="eyebrow">Photo editor</span><h2 id="crop-title">Get your best angle.</h2><p>Drag to reposition · Zoom to frame your face.</p></div><button className="icon-button" aria-label="Close photo editor" onClick={() => { setCropOpen(false); setSourcePhoto(''); }}><X size={21} /></button></div>
          <div className="crop-stage"><Cropper image={sourcePhoto} crop={crop} zoom={zoom} aspect={PHOTO_FRAME.width / PHOTO_FRAME.height} minZoom={1} maxZoom={3.5} zoomSpeed={0.15} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} showGrid={false} restrictPosition={true} /></div>
          <div className="zoom-controls"><span>−</span><input aria-label="Zoom photo" type="range" min="1" max="3.5" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span>+</span><button className="reset-zoom" onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}><RotateCcw size={15} /> Reset</button></div>
          <p className="crop-help">On your phone, you can also pinch to zoom and drag with one finger.</p>
          <div className="modal-actions"><button className="btn btn-dark" onClick={() => { setCropOpen(false); setSourcePhoto(''); }}>Cancel</button><button className="btn btn-primary" onClick={applyCrop}><Check size={18} /> Use this photo</button></div>
        </section>
      </div>}
    </>
  );
}

export default App;
