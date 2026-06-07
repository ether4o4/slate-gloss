import SQLite from 'react-native-sqlite-storage';

const db = SQLite.openDatabase(
  { name: 'chat_history.db', location: 'default' },
  () => { console.log('Database opened'); },
  error => { console.error('DB Error:', error); }
);

export const initDB = () => {
  db.transaction(tx => {
    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)'
    );
  });
};

export const saveMessage = (role: string, content: string) => {
  db.transaction(tx => {
    tx.executeSql('INSERT INTO messages (role, content) VALUES (?, ?)', [role, content]);
  });
};

export const getMessages = (callback: (messages: any[]) => void) => {
  db.transaction(tx => {
    tx.executeSql('SELECT * FROM messages ORDER BY timestamp ASC', [], (tx, results) => {
      const rows = results.rows;
      let messages = [];
      for (let i = 0; i < rows.length; i++) {
        messages.push(rows.item(i));
      }
      callback(messages);
    });
  });
};

export const clearHistory = () => {
  db.transaction(tx => {
    tx.executeSql('DELETE FROM messages');
  });
};
