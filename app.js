import { firebaseConfig } from "./firebase-config.js";

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   FIREBASE
========================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   ELEMENTS
========================= */

const username = document.getElementById("username");
const email = document.getElementById("email");
const password = document.getElementById("password");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const loginBox = document.getElementById("loginBox");
const chatBox = document.getElementById("chatBox");

const usersList = document.getElementById("usersList");

const groupBtn = document.getElementById("groupBtn");

const chatTitle = document.getElementById("chatTitle");

const messages = document.getElementById("messages");

const messageInput = document.getElementById("messageInput");

const sendBtn = document.getElementById("sendBtn");

const emojiBtn = document.getElementById("emojiBtn");

const picker = document.getElementById("picker");

const darkBtn = document.getElementById("darkBtn");

const typingStatus = document.getElementById("typingStatus");

const gifBtn = document.getElementById("gifBtn");

const previewAvatar = document.getElementById("previewAvatar");

/* =========================
   VARIABLES
========================= */

let currentChat = "group";
let currentUsername = "";
let currentAvatar = "";
let unsubscribeMessages = null;

/* =========================
   PROFILE PREVIEW
========================= */

username.addEventListener("input", () => {

  previewAvatar.src =
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${username.value}`;

});

/* =========================
   SIGNUP
========================= */

signupBtn.onclick = async () => {

  try {

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

    const avatar =
      `https://api.dicebear.com/7.x/thumbs/svg?seed=${username.value}`;

    await setDoc(
      doc(db, "users", userCredential.user.uid),
      {
        username: username.value,
        email: email.value,
        avatar: avatar,
        online: true
      }
    );

    alert("Account Created Successfully");

  } catch (err) {

    alert(err.message);

  }

};

/* =========================
   LOGIN
========================= */

loginBtn.onclick = async () => {

  try {

    await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );

  } catch (err) {

    alert(err.message);

  }

};

/* =========================
   LOGOUT
========================= */

logoutBtn.onclick = async () => {

  try {

    if (auth.currentUser) {

      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          online: false
        },
        { merge: true }
      );

    }

    await signOut(auth);

  } catch (err) {

    alert(err.message);

  }

};

/* =========================
   AUTH STATE
========================= */

onAuthStateChanged(auth, async (user) => {

  if (user) {

    loginBox.classList.add("hidden");
    chatBox.classList.remove("hidden");

    const userDocRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userDocRef);

    // CREATE USER DOC IF MISSING
    if (!userSnap.exists()) {

      await setDoc(userDocRef, {
        username: user.email.split("@")[0],
        email: user.email,
        avatar:
          `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.email}`,
        online: true
      });

    } else {

      await setDoc(
        userDocRef,
        {
          online: true
        },
        { merge: true }
      );

    }

    const updatedSnap = await getDoc(userDocRef);

    const userData = updatedSnap.data();

    currentUsername = userData.username;
    currentAvatar = userData.avatar;

    loadUsers();
    loadMessages();
    loadTyping();

    // USER OFFLINE WHEN TAB CLOSES
    window.addEventListener("beforeunload", async () => {

      await setDoc(
        userDocRef,
        {
          online: false
        },
        { merge: true }
      );

    });

  } else {

    loginBox.classList.remove("hidden");
    chatBox.classList.add("hidden");

  }

});

/* =========================
   LOAD USERS
========================= */

async function loadUsers() {

  usersList.innerHTML = "";

  const querySnapshot =
    await getDocs(collection(db, "users"));

  querySnapshot.forEach((docu) => {

    if (docu.id !== auth.currentUser.uid) {

      const button = document.createElement("button");

      button.classList.add("userItem");

      let status = "⚫";

      if (docu.data().online) {
        status = "🟢";
      }

      button.innerHTML = `
        <img
          src="${docu.data().avatar}"
          class="userAvatar"
        >

        ${status}
        ${docu.data().username}
      `;

      button.onclick = () => {

        const ids =
          [auth.currentUser.uid, docu.id].sort();

        currentChat =
          `private_${ids[0]}_${ids[1]}`;

        chatTitle.innerText =
          docu.data().username;

        loadMessages();

      };

      usersList.appendChild(button);

    }

  });

}

/* =========================
   GROUP CHAT
========================= */

groupBtn.onclick = () => {

  currentChat = "group";

  chatTitle.innerText = "Group Chat";

  loadMessages();

};

/* =========================
   SEND MESSAGE
========================= */

sendBtn.onclick = async () => {

  if (messageInput.value.trim() === "") return;

  await addDoc(
    collection(db, "messages"),
    {
      text: messageInput.value,
      username: currentUsername,
      avatar: currentAvatar,
      uid: auth.currentUser.uid,
      chat: currentChat,
      createdAt: serverTimestamp()
    }
  );

  messageInput.value = "";

};

/* =========================
   LOAD MESSAGES
========================= */

function loadMessages() {

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  const q =
    query(
      collection(db, "messages"),
      orderBy("createdAt")
    );

  unsubscribeMessages =
    onSnapshot(q, (snapshot) => {

      messages.innerHTML = "";

      snapshot.forEach((docu) => {

        const data = docu.data();

        if (data.chat === currentChat) {

          showMessage(data);

        }

      });

    });

}

/* =========================
   SHOW MESSAGE
========================= */

function showMessage(data) {

  const div = document.createElement("div");

  div.classList.add("message");

  if (data.uid === auth.currentUser.uid) {
    div.classList.add("me");
  }

  div.innerHTML = `

    <div class="messageTop">

      <img
        src="${data.avatar}"
        class="messageAvatar"
      >

      <b>${data.username}</b>

    </div>

    <div class="messageText">
      ${data.text || ""}
    </div>

  `;

  // GIF
  if (data.gif) {

    const gif = document.createElement("img");

    gif.src = data.gif;

    gif.classList.add("chatImage");

    div.appendChild(gif);

  }

  messages.appendChild(div);

  messages.scrollTop =
    messages.scrollHeight;

}

/* =========================
   EMOJI
========================= */

emojiBtn.onclick = () => {

  if (picker.style.display === "none") {

    picker.style.display = "block";

  } else {

    picker.style.display = "none";

  }

};

picker.addEventListener(
  "emoji-click",
  (event) => {

    messageInput.value +=
      event.detail.unicode;

  }
);

/* =========================
   DARK MODE
========================= */

darkBtn.onclick = () => {

  document.body.classList.toggle("dark");

};

/* =========================
   TYPING
========================= */

messageInput.addEventListener(
  "input",
  async () => {

    if (!auth.currentUser) return;

    await setDoc(
      doc(db, "typing", auth.currentUser.uid),
      {
        username: currentUsername,
        chat: currentChat,
        typing: true
      }
    );

    clearTimeout(window.typingTimeout);

    window.typingTimeout =
      setTimeout(async () => {

        await setDoc(
          doc(db, "typing", auth.currentUser.uid),
          {
            username: currentUsername,
            chat: currentChat,
            typing: false
          }
        );

      }, 1000);

  }
);

/* =========================
   LOAD TYPING
========================= */

function loadTyping() {

  onSnapshot(
    collection(db, "typing"),
    (snapshot) => {

      typingStatus.innerText = "";

      snapshot.forEach((docu) => {

        const data = docu.data();

        if (
          data.chat === currentChat &&
          data.typing &&
          docu.id !== auth.currentUser.uid
        ) {

          typingStatus.innerText =
            `${data.username} is typing...`;

        }

      });

    }
  );

}

/* =========================
   GIF
========================= */

gifBtn.onclick = async () => {

  const search = prompt("Search GIF");

  if (!search) return;

  try {

    const response =
      await fetch(
        `https://g.tenor.com/v1/search?q=${search}&key=LIVDSRZULELA&limit=1`
      );

    const data = await response.json();

    if (data.results.length > 0) {

      const gifUrl =
        data.results[0]
          .media[0]
          .gif.url;

      await addDoc(
        collection(db, "messages"),
        {
          text: "",
          gif: gifUrl,
          username: currentUsername,
          avatar: currentAvatar,
          uid: auth.currentUser.uid,
          chat: currentChat,
          createdAt: serverTimestamp()
        }
      );

    }

  } catch (err) {

    alert("GIF failed");

  }

};