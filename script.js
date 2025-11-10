import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { getDatabase, ref, set, push, onValue, get, child, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

    // ====== FIREBASE CONFIG (sudah sesuai yang kamu kirim) ======
    const firebaseConfig = {
      apiKey: "AIzaSyCW6L-CQHl5DyLBQgX9O6h1Wo_Loa4UtyE",
      authDomain: "makalah-342e7.firebaseapp.com",
      databaseURL: "https://makalah-342e7-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "makalah-342e7",
      storageBucket: "makalah-342e7.firebasestorage.app",
      messagingSenderId: "635345603371",
      appId: "1:635345603371:web:d6930dbf6f1810c333136e",
      measurementId: "G-9DBYNME6FV"
    };
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const db = getDatabase(app);

    // App config
    const WA_PHONE = '62881010862835';
    const GOPAY_NO = '0881010862835';
    const DANA_NO  = '0881010862835';

    document.getElementById('year').textContent = new Date().getFullYear();

    // Price calc
    function calcPrice(p){ p=Number(p)||1; return p<=8?10000:10000+Math.ceil((p-8)/2)*2000; }
    const pagesInput=document.getElementById('pages'), btnPrice=document.getElementById('btnPrice');
    function refreshBtnPrice(){ btnPrice.textContent = 'Rp' + calcPrice(pagesInput.value).toLocaleString('id-ID'); }
    pagesInput.addEventListener('input', refreshBtnPrice);
    refreshBtnPrice();

    // Realtime references
    const ordersRef = ref(db, 'orders');
    const testsRef  = ref(db, 'testimonials');

    // Render helpers
    function escapeHtml(str){ if(!str && str !== 0) return ''; return String(str).replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

    // Listen orders (realtime)
    onValue(ordersRef, snap => {
      const data = snap.val() || {};
      // convert to array sorted newest first by created or key
      const arr = Object.keys(data).map(k => ({ _key:k, ...data[k] }));
      arr.sort((a,b) => (b.created || 0) - (a.created || 0));
      const tbody = document.querySelector('#ordersTable tbody');
      if(!arr.length){ tbody.innerHTML = '<tr><td colspan="9" class="muted">Belum ada order</td></tr>'; return; }
      tbody.innerHTML = arr.map(o => {
        const status = o.status || 'pending';
        return `<tr>
          <td>${escapeHtml(o.id)}</td>
          <td>${escapeHtml(o.name)}</td>
          <td>${escapeHtml(o.subject)}</td>
          <td>${escapeHtml(o.pages)}</td>
          <td>${escapeHtml(o.deadline||'-')}</td>
          <td>Rp${Number(o.price||0).toLocaleString('id-ID')}</td>
          <td>${escapeHtml(o.payment||'-')}</td>
          <td>${escapeHtml(status)}</td>
          <td>
            <button data-key="${o._key}" class="btn-paid">Paid</button>
            <button data-key="${o._key}" class="btn-done">Selesai</button>
            <button data-key="${o._key}" class="btn-del">Hapus</button>
          </td>
        </tr>`;
      }).join('');

      // bind actions
      document.querySelectorAll('.btn-paid').forEach(b => b.onclick = async (e) => {
        const key = e.target.dataset.key;
        await update(ref(db, 'orders/' + key), { status: 'paid' });
        alert('Order ditandai PAID.');
      });
      document.querySelectorAll('.btn-done').forEach(b => b.onclick = async (e) => {
        const key = e.target.dataset.key;
        await update(ref(db, 'orders/' + key), { status: 'done' });
        alert('Order ditandai SELESAI.');
      });
      document.querySelectorAll('.btn-del').forEach(b => b.onclick = async (e) => {
        const key = e.target.dataset.key;
        if(!confirm('Hapus order ini?')) return;
        await remove(ref(db, 'orders/' + key));
        alert('Order dihapus.');
      });
    });

    // Listen testimonials (realtime)
    onValue(testsRef, snap => {
      const data = snap.val() || {};
      const arr = Object.keys(data).map(k => ({ _key:k, ...data[k] }));
      arr.sort((a,b) => (b.created || 0) - (a.created || 0));
      const wrap = document.getElementById('testimonials');
      wrap.innerHTML = arr.length ? arr.map(t => `<div style="padding:8px;border-bottom:1px solid #eef3f7"><strong>${escapeHtml(t.name)}</strong><br>${escapeHtml(t.text)}</div>`).join('') : '<div class="muted">Belum ada testimonial</div>';
      // admin testimonial list
      const adminTests = document.getElementById('adminTestimonials');
      if(adminTests) adminTests.innerHTML = arr.map(t=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #eef3f7">
        <div><strong>${escapeHtml(t.name)}</strong><div class="small">${escapeHtml(t.text)}</div></div>
        <div><button data-key="${t._key}" class="t-del">Hapus</button></div></div>`).join('');
      // bind delete testimonial in admin
      document.querySelectorAll('.t-del').forEach(b => b.onclick = async e => {
        const k = e.target.dataset.key;
        if(!confirm('Hapus testimonial ini?')) return;
        await remove(ref(db,'testimonials/'+k));
        alert('Testimonial dihapus.');
      });
    });

    // Submit order (save to firebase + open WA)
    document.getElementById('orderForm').addEventListener('submit', async e => {
      e.preventDefault();
      // build order ID and data
      const id = 'ORD' + Date.now().toString().slice(-8);
      const order = {
        id,
        name: document.getElementById('name').value.trim(),
        kelas: document.getElementById('kelas').value.trim(),
        subject: document.getElementById('subject').value.trim(),
        pages: Number(document.getElementById('pages').value) || 1,
        deadline: document.getElementById('deadline').value || '-',
        message: document.getElementById('message').value.trim() || '-',
        payment: document.getElementById('paymentMethod').value,
        price: calcPrice(document.getElementById('pages').value),
        status: 'pending',
        created: Date.now()
      };
      // write to db under key = id (so key equals id)
      await set(ref(db,'orders/'+id), order);

      // payment text
      let paymentText = '';
      if(order.payment === 'gopay') paymentText = `💳 *Metode Pembayaran:* GoPay\nNomor: ${GOPAY_NO}`;
      else if(order.payment === 'dana') paymentText = `💳 *Metode Pembayaran:* DANA\nNomor: ${DANA_NO}`;
      else paymentText = '💳 *Metode Pembayaran:* Cash';

      const waMessage = [
        '🧾 *ORDER JOKI MAKALAH BARU*','',
        `📦 *ID Order:* ${order.id}`,
        `👤 *Nama:* ${order.name}`,
        `🏫 *Kelas:* ${order.kelas || '-'}`,
        `📚 *Mata Pelajaran:* ${order.subject}`,
        `📄 *Jumlah Halaman:* ${order.pages}`,
        `⏰ *Deadline:* ${order.deadline}`,
        `📝 *Catatan:* ${order.message}`,
        '',
        `💰 *Total Harga:* Rp${order.price.toLocaleString('id-ID')}`,
        '',
        paymentText,
        '',
        'Mohon konfirmasi jika sudah transfer atau ingin tanya-tanya 🙏',
        '',
        'Terima kasih telah menggunakan layanan *Joki Makalah Pelajar*!'
      ].join('\n');

      // open WA
      window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(waMessage)}`, '_blank');
      alert('Order terkirim! ID: ' + order.id);
      e.target.reset(); document.getElementById('pages').value = 8; refreshBtnPrice();
    });

    // Add testimonial (admin)
    document.getElementById('addTest').onclick = async () => {
      const n = document.getElementById('tName').value.trim(), t = document.getElementById('tText').value.trim();
      if(!n || !t) return alert('Isi nama & testimonial');
      const newRef = push(ref(db,'testimonials'));
      await set(newRef, { name: n, text: t, created: Date.now() });
      document.getElementById('tName').value=''; document.getElementById('tText').value='';
      alert('Testimonial ditambahkan.');
    };

    // Admin hidden login (click logo 5x)
    const adminModal = document.getElementById('adminModal');
    document.getElementById('closeAdmin').onclick = () => adminModal.style.display='none';
    let clicks = 0, clickTimer = null;
    document.getElementById('logo').onclick = () => {
      clicks++; if(clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(()=>clicks=0,2000);
      if(clicks >= 5){ clicks = 0; const p = prompt('Masukkan password admin:'); if(p === 'udinjoki') adminModal.style.display='flex'; else if(p !== null) alert('Password salah'); }
    };

    // --------- Admin Command processing ----------
    document.getElementById('runCmd').onclick = async () => {
      const raw = document.getElementById('cmdInput').value.trim();
      if(!raw) return alert('Masukkan command (mis. /paid ORD123...)');
      // parse
      const parts = raw.replace(/^\//,'').split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const targetId = parts[1];
      if(!targetId) return alert('Format salah — sertakan ORDER_ID, mis: /paid ORD2025...');

      // reference to that order key (we store using id as key)
      const orderRef = ref(db, 'orders/' + targetId);
      const snap = await get(orderRef);
      if(!snap.exists()) return alert('Order tidak ditemukan: ' + targetId);

      if(cmd === 'paid') {
        await update(orderRef, { status: 'paid' });
        alert('Order ' + targetId + ' ditandai PAID.');
      } else if(cmd === 'done' || cmd === 'selesai') {
        await update(orderRef, { status: 'done' });
        alert('Order ' + targetId + ' ditandai SELESAI.');
      } else if(cmd === 'delete' || cmd === 'del' || cmd === 'hapus') {
        if(!confirm('Yakin hapus order ' + targetId + '?')) return;
        await remove(orderRef);
        alert('Order ' + targetId + ' dihapus.');
      } else {
        alert('Command tidak dikenali: ' + cmd + '\nSupport: /paid /done /delete');
      }
      document.getElementById('cmdInput').value = '';
    };

  // optional: allow pressing Enter in command input to run
    document.getElementById('cmdInput').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); document.getElementById('runCmd').click(); } });