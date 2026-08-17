import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// >>> මේ line දෙකට ඔයාගේ project URL / public key දාන්න (පාස්වර්ඩ් key එක නෙවෙයි)
const SUPABASE_URL = 'https://qcgnithiuijkfwljgjtw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LIK_puTBlk5sfOFu4ShIPw_XWTlFd55';
// <<< ඉස්සෙල්ල saved කරගත්ත values දෙක මෙතැනට දාන්න

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let products = [];
let selectedProduct = null;
let qty = 1;

const sections = {
  home: document.getElementById('home-section'),
  auth: document.getElementById('auth-section'),
  dashboard: document.getElementById('dashboard-section'),
  topup: document.getElementById('topup-section'),
  orders: document.getElementById('orders-section'),
  help: document.getElementById('help-section')
};

function showSection(name) {
  Object.entries(sections).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
  });
}

function setLoggedInUI(isLoggedIn) {
  document.getElementById('nav-login').classList.toggle('hidden', isLoggedIn);
  document.getElementById('nav-logout').classList.toggle('hidden', !isLoggedIn);
  document.getElementById('nav-orders').classList.toggle('hidden', !isLoggedIn);
}

document.getElementById('year').textContent = new Date().getFullYear();

// ---------- NAVIGATION / HOME BUTTONS ----------

// Home hero buttons → auth
document.getElementById('home-register').onclick = () => showSection('auth');
document.getElementById('home-login').onclick = () => showSection('auth');
// Header login
document.getElementById('nav-login').onclick = () => showSection('auth');
// Help
document.getElementById('nav-help').onclick = () => showSection('help');

// My Orders (load + show)
document.getElementById('nav-orders').onclick = async () => {
  await loadOrders();
  showSection('orders');
};

// Free Fire SG card + Hero CTA → Topup page
document.getElementById('card-freefire').onclick = () => showSection('topup');
document.getElementById('hero-topup').onclick = () => showSection('topup');

// Logout
document.getElementById('nav-logout').onclick = async () => {
  await supabase.auth.signOut();
  setLoggedInUI(false);
  showSection('home');
};

// Qty +/- buttons
document.getElementById('qty-minus').onclick = () => {
  if (qty > 1) {
    qty--;
    updateQtyAndTotal();
  }
};
document.getElementById('qty-plus').onclick = () => {
  qty++;
  updateQtyAndTotal();
};

function updateQtyAndTotal() {
  document.getElementById('qty-value').textContent = qty;
  const totalEl = document.getElementById('total-amount');
  if (!selectedProduct) {
    totalEl.textContent = 'Rs. 0';
  } else {
    totalEl.textContent = `Rs. ${selectedProduct.unit_price * qty}`;
  }
}

function selectProduct(p) {
  selectedProduct = p;
  qty = 1;
  updateQtyAndTotal();
  document.getElementById('selected-product-text').textContent =
    `${p.name} — Rs. ${p.unit_price}`;

  // highlight card
  document.querySelectorAll('.product-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.id === p.id);
  });
}

function renderProducts() {
  const membershipList = document.getElementById('membership-list');
  const evoList = document.getElementById('evo-list');
  const diamondsList = document.getElementById('diamonds-list');
  membershipList.innerHTML = '';
  evoList.innerHTML = '';
  diamondsList.innerHTML = '';

  for (const p of products) {
    const div = document.createElement('div');
    div.className = 'product-card';
    div.dataset.id = p.id;
    div.innerHTML = `
      <div>${p.name}</div>
      ${p.diamonds ? `<div>${p.diamonds} 💎</div>` : ''}
      ${p.duration_days ? `<div>${p.duration_days} days</div>` : ''}
      <div class="price">Rs. ${p.unit_price}</div>
    `;
    div.onclick = () => selectProduct(p);

    if (p.category === 'membership') membershipList.appendChild(div);
    else if (p.category === 'evo') evoList.appendChild(div);
    else diamondsList.appendChild(div);
  }
}

// ---------- LOAD PRODUCTS ----------

async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error(error);
    alert('Error loading products');
    return;
  }
  products = data;
  renderProducts();
}

// ---------- AUTH: REGISTER / LOGIN ----------

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone }
    }
  });

  if (error) {
    alert('Register error: ' + error.message);
    return;
  }

  alert('Account created. Check your email and confirm before login.');
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login error: ' + error.message);
    return;
  }

  setLoggedInUI(true);
  await loadProducts();
  await loadOrders();
  showSection('home'); // login උනාට පස්සේ Home page එකට යයි
});

// ---------- PLACE ORDER ----------

document.getElementById('topup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const messageEl = document.getElementById('topup-message');
  messageEl.textContent = '';
  messageEl.className = 'message';

  const ffUid = document.getElementById('ff-uid').value.trim();
  const ffUsername = document.getElementById('ff-username').value.trim();
  const paymentRef = document.getElementById('payment-ref').value.trim();
  const slipFile = document.getElementById('payment-slip').files[0];
  const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

  if (!selectedProduct) {
    messageEl.textContent = 'Please select a package.';
    messageEl.classList.add('error');
    return;
  }

  if (!ffUid || !ffUsername || !paymentRef || !slipFile) {
    messageEl.textContent = 'Fill all fields and attach slip.';
    messageEl.classList.add('error');
    return;
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) {
    messageEl.textContent = 'Please login again.';
    messageEl.classList.add('error');
    showSection('auth');
    return;
  }

  const total = selectedProduct.unit_price * qty;

  messageEl.textContent = 'Placing order...';
  try {
    // 1) create order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        ff_uid: ffUid,
        ff_username: ffUsername,
        currency: 'LKR',
        total_amount: total,
        payment_method: paymentMethod,
        status: 'pending_payment'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const orderId = orderData.id;

    // 2) order item
    const { error: itemError } = await supabase.from('order_items').insert({
      order_id: orderId,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      unit_price: selectedProduct.unit_price,
      qty,
      line_total: total
    });
    if (itemError) throw itemError;

    // 3) upload slip
    const path = `${orderId}/${Date.now()}-${slipFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('slips')
      .upload(path, slipFile);
    if (uploadError) throw uploadError;

    // 4) save payment proof
    const { error: proofError } = await supabase.from('payment_proofs').insert({
      order_id: orderId,
      reference_no: paymentRef,
      slip_path: uploadData.path
    });
    if (proofError) throw proofError;

    messageEl.textContent = 'Order placed! We will verify payment and topup soon.';
    messageEl.classList.add('success');
    document.getElementById('topup-form').reset();
    selectedProduct = null;
    document.getElementById('selected-product-text').textContent = 'None';
    qty = 1;
    updateQtyAndTotal();
    await loadOrders();
  } catch (err) {
    console.error(err);
    messageEl.textContent = 'Error placing order. Try again.';
    messageEl.classList.add('error');
  }
});

// ---------- LOAD ORDERS ----------

async function loadOrders() {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) return;

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const list = document.getElementById('orders-list');
  list.innerHTML = '';

  if (!data.length) {
    list.textContent = 'No orders yet.';
    return;
  }

  for (const o of data) {
    const div = document.createElement('div');
    div.className = 'order-item';
    div.innerHTML = `
      <div><strong>${o.ff_username}</strong> (${o.ff_uid})</div>
      <div>Amount: Rs. ${o.total_amount} | Payment: ${o.payment_method}</div>
      <div>Status: <span class="order-status ${o.status}">${o.status}</span></div>
      <div style="font-size:0.75rem; color:#9ca3af;">${new Date(o.created_at).toLocaleString()}</div>
    `;
    list.appendChild(div);
  }
}

// ---------- INIT ----------

async function init() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  // packages load කරගන්න (Topup page use වෙනවා)
  await loadProducts();

  if (session) {
    setLoggedInUI(true);
    await loadOrders();
  } else {
    setLoggedInUI(false);
  }

  // Start always on Home page (hero + services)
  showSection('home');

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      setLoggedInUI(true);
      await loadOrders();
    } else {
      setLoggedInUI(false);
    }
    showSection('home');
  });
}

init();
