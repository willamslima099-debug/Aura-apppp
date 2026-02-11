
import { User, ChatMessage } from '../types';

const DB_NAME = 'AuraCompanionDB';
const DB_VERSION = 1;

export class DatabaseService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('users')) {
          // Fix: db.transaction is a method, not a property. 
          // During upgrade, use the store returned by createObjectStore to create indexes.
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          // Secondary index for username
          userStore.createIndex('username', 'username', { unique: true });
        }
        if (!db.objectStoreNames.contains('messages')) {
          // Fix: db.transaction is a method, not a property.
          // During upgrade, use the store returned by createObjectStore to create indexes.
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('userId', 'userId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => reject('Erro ao abrir o banco de dados');
    });
  }

  async saveUser(user: User): Promise<void> {
    return this.performTransaction('users', 'readwrite', (store) => store.put(user));
  }

  async getUser(username: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction('users', 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('username');
      const request = index.get(username);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject('Erro ao buscar usuário');
    });
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    return this.performTransaction('messages', 'readwrite', (store) => store.put(message));
  }

  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction('messages', 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('userId');
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const sorted = (request.result as ChatMessage[]).sort((a, b) => a.timestamp - b.timestamp);
        resolve(sorted);
      };
      request.onerror = () => reject('Erro ao buscar histórico');
    });
  }

  private performTransaction(
    storeName: string,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = action(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Erro na transação');
    });
  }
}

export const dbService = new DatabaseService();
