import React from 'react'
import { FaExclamationTriangle } from 'react-icons/fa'

const InternetInfo: React.FC =  () => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-light text-danger" style={{overflow: "hidden"}}> 
    <FaExclamationTriangle size={20} className="mb-3 blink" />
    <h3 className="">No Internet</h3>
    <h5 className='text-secondary'>Please check your internet connection</h5>
  </div>
  )
}

export default InternetInfo