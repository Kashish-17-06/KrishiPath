import Find from './pages/Find';
import Book from './pages/Book';
import Dashboard from './pages/Dashboard';
import Lots from './pages/Lots';
import Track from './pages/Track';

export default [
  { path: '/transport/find', element: <Find />, roles: ['farmer'] },
  { path: '/transport/book', element: <Book />, roles: ['farmer'] },
  { path: '/transport/dashboard', element: <Dashboard />, roles: ['transporter'] },
  { path: '/transport/lots', element: <Lots />, roles: ['farmer', 'fpo'] },
  { path: '/transport/track', element: <Track />, roles: ['farmer', 'transporter', 'buyer', 'fpo', 'admin'] },
];
