import Landing from './pages/Landing'
import Home from './pages/Home'
import AddCrop from './pages/AddCrop'
import Market from './pages/Market'
import Routes from './pages/Routes'
import RouteDetail from './pages/RouteDetail'
import History from './pages/History'
const F=['farmer']
export default [{path:'/',element:<Landing/>},{path:'/farmer/home',element:<Home/>,roles:F},{path:'/farmer/add-crop',element:<AddCrop/>,roles:F},{path:'/farmer/market',element:<Market/>,roles:F},{path:'/farmer/routes',element:<Routes/>,roles:F},{path:'/farmer/route/:routeId',element:<RouteDetail/>,roles:F},{path:'/farmer/history',element:<History/>,roles:F}]
