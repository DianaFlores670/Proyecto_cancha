import axios from 'axios'

const api = axios.create({
  //aca modificar la red del wifi conectado 
  //baseURL: 'http://192.168.26.3:3000',
  //baseURL: 'http://localhost:3000',
  baseURL:'https://proyecto-cancha.onrender.com',   
  timeout: 10000
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
) 

export default api
