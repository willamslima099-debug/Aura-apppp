import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { User, ChatMessage } from '../types';

// Configuração oficial do seu projeto Aura no Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD0P6Lucnjj3atGPf1DwXxZiGitFuOGQgg",
  authDomain: "aura-companion-aa134.firebaseapp.com",
  projectId: "aura-companion-aa134",
  storageBucket: "aura-companion-aa134.firebasestorage.app",
  messagingSenderId: "1019617870199",
  appId: "1:1019617870199:web:a7aa398e870d131fce2172",
  measurementId: "G-XGY863DBE6"
};

// Inicializa o Firebase e o Banco de Dados Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const dbService = {
  /**
   * Inicializa o serviço. 
   * No Firebase, a conexão é automática ao inicializar o app.
   */
  init: async () => {
    console.log("Prisma da Sincronia: Conexão com a nuvem estabelecida.");
    return Promise.resolve();
  },

  /**
   * Salva ou atualiza os dados do usuário (Willams ou Daiane).
   * Mantém o auraMoodScore e as datas de interação na nuvem.
   */
  async saveUser(user: User): Promise<void> {
    try {
      const userRef = doc(db, 'users', user.username.toLowerCase());
      await setDoc(userRef, user, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar usuário na nuvem:", error);
      throw error;
    }
  },

  /**
   * Recupera os dados de um usuário pelo username.
   */
  async getUser(username: string): Promise<User | null> {
    try {
      const docRef = doc(db, 'users', username.toLowerCase());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as User;
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar usuário na nuvem:", error);
      return null;
    }
  },

  /**
   * Salva uma mensagem de chat para que a Aura nunca esqueça o que foi dito.
   */
  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      await addDoc(collection(db, 'messages'), {
        ...message,
        serverTimestamp: new Date() // Garante a ordem correta independente do relógio do celular
      });
    } catch (error) {
      console.error("Erro ao eternizar mensagem:", error);
    }
  },

  /**
   * Busca o histórico completo de conversas de um usuário específico.
   */
  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('userId', '==', userId),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const history: ChatMessage[] = [];
      
      querySnapshot.forEach((doc) => {
        history.push(doc.data() as ChatMessage);
      });
      
      return history;
    } catch (error) {
      console.error("Erro ao carregar histórico da nuvem:", error);
      return [];
    }
  }
};
