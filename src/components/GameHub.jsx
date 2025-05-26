import React from 'react';

const GameHub = () => {
  const styles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#f4f4f4',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    header: {
      textAlign: 'center',
      color: '#333',
      marginBottom: '30px'
    },
    section: {
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#fff',
      borderRadius: '5px',
    },
    subheading: {
      color: '#555',
      borderBottom: '2px solid #eee',
      paddingBottom: '5px',
      marginBottom: '10px'
    },
    listItem: {
      marginBottom: '8px',
    },
    gameItem: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
    },
    gameName: {
      fontWeight: 'bold',
    },
    gameStatus: {
      fontStyle: 'italic',
      color: '#777',
    }
  };

  return (
    <div style={styles.container}>
      <header>
        <h1 style={styles.header}>Universal Game Hub</h1>
      </header>

      <section style={styles.section}>
        <h2 style={styles.subheading}>Our Vision</h2>
        <p>
          A game hub that has a collection of Christian games, nostalgic gaming
          experiences, and educational games.
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.subheading}>Available Games</h2>
        <div style={styles.gameItem}>
          <span style={styles.gameName}>Name, Place, Animal, Thing</span>
          <span style={styles.gameStatus}>(Coming Soon!)</span>
        </div>
        <div style={styles.gameItem}>
          <span style={styles.gameName}>Rhythmic Naming Game</span>
          <span style={styles.gameStatus}>
            <a href="/rhythmic-game.html" style={{ color: styles.gameStatus.color, textDecoration: 'none' }}>(Click to Play!)</a>
          </span>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.subheading}>Future Games Coming Soon</h2>
        <ul>
          <li style={styles.listItem}>Biro game</li>
          <li style={styles.listItem}>Bottle flip</li>
          <li style={styles.listItem}>Five a side football</li>
          <li style={styles.listItem}>X and O</li>
          <li style={styles.listItem}>(and many more)</li>
        </ul>
      </section>
    </div>
  );
};

export default GameHub;
