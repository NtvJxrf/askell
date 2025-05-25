import { createRoot } from 'react-dom/client'
import App from './components/App.jsx'
import { Provider } from 'react-redux';
import store from '../src/store.js'

document.body.style.margin = "0";
document.body.style.padding = "0";


createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>,
)
