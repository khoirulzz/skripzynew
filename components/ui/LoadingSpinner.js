import React from 'react';

const LoadingSpinner = ({ size = 40, className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="-13 -13 45 45"
        xmlns="http://www.w3.org/2000/svg"
        className="loading-spinner-svg"
      >
        <g>
          <circle className="box5631" cx="13" cy="1" r="5" />
          <circle className="box5631" cx="13" cy="1" r="5" />
          <circle className="box5631" cx="25" cy="25" r="5" />
          <circle className="box5631" cx="13" cy="13" r="5" />
          <circle className="box5631" cx="13" cy="13" r="5" />
          <circle className="box5631" cx="25" cy="13" r="5" />
          <circle className="box5631" cx="1" cy="25" r="5" />
          <circle className="box5631" cx="13" cy="25" r="5" />
          <circle className="box5631" cx="25" cy="25" r="5" />
        </g>
      </svg>
    </div>
  );
};

export default LoadingSpinner;
