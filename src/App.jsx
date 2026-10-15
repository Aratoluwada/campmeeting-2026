import { useCallback, useEffect, useMemo, useState } from 'react';
import React from "react";
import Cropper from 'react-easy-crop';
import { ArrowRight, Camera, Check, Download, ImagePlus, LoaderCircle, MessageCircle, RotateCcw, Share2, Sparkles, Upload, X } from 'lucide-react';
import './App.css';

const TEMPLATE_URL = '/assets/attendance-template.svg';
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1397;
const PHOTO_FRAME = { x: 350, y: 540, width: 380, height: 360 };
const NAME_FRAME = { x: 275, y: 915, width: 537, height: 77 };

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

function App() {
  const [started, setStarted] = useState(false);
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

  async function shareDesign() {
    if (!designBlob) return;
    const file = new File([designBlob], `homecoming-2026-${firstName.trim() || 'attendance'}.png`, { type: 'image/png' });
    const shareData = { files: [file], title: 'Homecoming & Campmeeting 2026', text: attendanceMessage(firstName) };
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share(shareData);
      else {
        await downloadDesign();
        setSuccess('Image downloaded. Attach it to your post or message to share it.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Sharing was not available. Download the image and share it from your gallery.');
    }
  }

  function shareWhatsApp() {
    const message = attendanceMessage(firstName);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  function startAgain() {
    setFirstName(''); setSourcePhoto(''); setCroppedPhoto(''); setDesignBlob(null); setError(''); setSuccess(''); setStarted(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Homecoming and Campmeeting home">
          <span className="brand-mark">CH</span>
          <span><strong>City Harvest Church</strong><small>HOMEcoming &amp; CAMPMEETING 2026</small></span>
        </a>
        <span className="top-pill">THE WONDERFUL GOD</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15} /> OCTOBER 21–25, 2026 · ABEOKUTA</span>
          <h1>Let the world know<br /><em>you'll be there.</em></h1>
          <p>Create your personalized attendance design for Homecoming &amp; Campmeeting 2026. Add your photo, make it yours, and invite someone to join you.</p>
          {!started && <button className="primary-button" onClick={() => setStarted(true)}>Create my design <ArrowRight size={20} /></button>}
          <div className="privacy-note"><span className="privacy-dot" /> Free to use. Your photo stays on your device.</div>
        </div>
        <div className="hero-art" aria-label="Preview of an attendance card">
          <div className="art-glow" />
          <div className="mini-card">
            <div className="mini-card-top">I WILL BE<br />ATTENDING!</div>
            <div className="mini-photo"><Camera size={46} strokeWidth={1.4} /></div>
            <div className="mini-name">YOUR NAME</div>
            <div className="mini-event">HOMECOMING &amp; CAMPMEETING 2026</div>
            <div className="mini-theme">THE WONDERFUL GOD</div>
          </div>
          <span className="spark spark-one">✦</span><span className="spark spark-two">✧</span>
        </div>
      </section>

      {started && <section className="builder" aria-labelledby="builder-title">
        <div className="builder-heading"><div><span className="section-kicker">YOUR PERSONALIZED CARD</span><h2 id="builder-title">Make it yours.</h2><p>Just your first name and a photo. That's all you need.</p></div><span className="step-badge">STEP 1 OF 2</span></div>
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
            <button className="primary-button full-button" onClick={generateDesign} disabled={isGenerating}>{isGenerating ? <><LoaderCircle className="spin" size={19} /> Creating your design…</> : <>Generate my design <ArrowRight size={19} /></>}</button>
            <button className="back-button" onClick={startAgain}>Cancel and go back</button>
          </div>

          <div className="preview-panel">
            <div className="preview-label"><span>LIVE PREVIEW</span><span className="live-dot" /> <small>Updates as you type</small></div>
            <div className="poster-preview">
              <img className="poster-background" src={TEMPLATE_URL} alt="Homecoming and Campmeeting 2026 attendance design background" />
              {photoPreview && <img className="poster-person" src={photoPreview} alt="Your photo in the attendance card" />}
              <div className={`poster-name ${firstName.trim().length > 17 ? 'long-name' : ''}`}>{firstName.trim() || 'YOUR NAME'}</div>
            </div>
            <p className="preview-caption"><Check size={15} /> Your photo and name are added to the design in your browser.</p>
          </div>
        </div>

        {designUrl && <div className="result-panel">
          <div className="result-heading"><span className="result-check"><Check size={20} /></span><div><h3>Your design is ready!</h3><p>It's time to spread the word and invite someone along.</p></div></div>
          <img className="final-design" src={designUrl} alt="Your completed Homecoming and Campmeeting attendance design" />
          <div className="result-actions"><button className="primary-button" onClick={downloadDesign}><Download size={18} /> Download PNG</button><button className="secondary-button" onClick={shareDesign}><Share2 size={18} /> Share design</button><button className="whatsapp-button" onClick={shareWhatsApp}><MessageCircle size={18} /> Share message</button></div>
          <p className="share-hint">“I'm attending Homecoming &amp; Campmeeting 2026! Join me as we encounter The Wonderful God. 🙌”</p>
          <button className="back-button" onClick={startAgain}>Create another design</button>
        </div>}
      </section>}

      <section className="details-strip"><div><span className="detail-icon">✦</span><span><strong>THE WONDERFUL GOD</strong><small>Our theme for 2026</small></span></div><div><span className="detail-icon">◷</span><span><strong>OCT 21–25, 2026</strong><small>Morning 6 AM · Evening 5 PM</small></span></div><div><span className="detail-icon">⌖</span><span><strong>TRANSFORMATION CENTER</strong><small>Somorin, Abeokuta</small></span></div></section>
      <footer className="footer"><span>Made with love for <strong>City Harvest Church International</strong></span><span>HOMEcoming &amp; CAMPMEETING 2026</span></footer>

      {cropOpen && sourcePhoto && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCropOpen(false); setSourcePhoto(''); } }}>
        <section className="crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title">
          <div className="modal-header"><div><span className="section-kicker">PHOTO EDITOR</span><h2 id="crop-title">Get your best angle.</h2><p>Drag to reposition · Zoom to frame your face.</p></div><button className="icon-button" aria-label="Close photo editor" onClick={() => { setCropOpen(false); setSourcePhoto(''); }}><X size={21} /></button></div>
          <div className="crop-stage"><Cropper image={sourcePhoto} crop={crop} zoom={zoom} aspect={PHOTO_FRAME.width / PHOTO_FRAME.height} minZoom={1} maxZoom={3.5} zoomSpeed={0.15} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} showGrid={false} restrictPosition={true} /></div>
          <div className="zoom-controls"><span>−</span><input aria-label="Zoom photo" type="range" min="1" max="3.5" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span>+</span><button className="reset-zoom" onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}><RotateCcw size={15} /> Reset</button></div>
          <p className="crop-help">On your phone, you can also pinch to zoom and drag with one finger.</p>
          <div className="modal-actions"><button className="secondary-button" onClick={() => { setCropOpen(false); setSourcePhoto(''); }}>Cancel</button><button className="primary-button" onClick={applyCrop}><Check size={18} /> Use this photo</button></div>
        </section>
      </div>}
    </main>
  );
}

function attendanceMessage(name) {
  const greeting = name?.trim() ? `${name.trim()} is attending` : 'I am attending';
  return `🙌 ${greeting} Homecoming & Campmeeting 2026 at City Harvest Church International!\n\nOur theme is “The Wonderful God”. Join us from October 21–25, 2026, at Transformation Center, Abeokuta.\n\nMorning sessions: 6AM | Evening sessions: 5PM\n\nCome and experience God's goodness with us!\n#HomecomingAndCampmeeting2026 #TheWonderfulGod`;
}

export default App;
