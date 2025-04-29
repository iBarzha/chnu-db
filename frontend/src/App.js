import React from 'react';
import ItemList from './components/ItemList';

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <h1>My Django-React App</h1>
                <ItemList />
            </header>
        </div>
    );
}

export default App;