#!/bin/bash

# Docker Deployment Script for Linux/Mac

while true; do
  clear
  echo "====================================="
  echo "Docker Deployment Menu"
  echo "====================================="
  echo ""
  echo "1. Build and Start (Docker Compose)"
  echo "2. Stop Containers"
  echo "3. View Logs"
  echo "4. Restart Services"
  echo "5. Stop and Remove All"
  echo "6. View Running Containers"
  echo "7. Show Docker Images"
  echo "8. Show Container Details"
  echo "9. Deploy to VPS"
  echo "10. Exit"
  echo ""
  read -p "Select option (1-10): " choice

  case $choice in
    1)
      echo "Building and starting containers..."
      cd "$(dirname "$0")"
      docker-compose build
      docker-compose up -d
      echo ""
      echo "✓ Containers started!"
      echo "Access at: http://localhost:3000"
      echo ""
      read -p "Press Enter to continue..."
      ;;
    2)
      echo "Stopping containers..."
      docker-compose stop
      echo "✓ Containers stopped!"
      read -p "Press Enter to continue..."
      ;;
    3)
      echo "Showing logs (Press Ctrl+C to exit)..."
      docker-compose logs -f
      ;;
    4)
      echo "Restarting services..."
      docker-compose restart
      echo "✓ Services restarted!"
      read -p "Press Enter to continue..."
      ;;
    5)
      echo "Stopping and removing all containers..."
      docker-compose down -v
      echo "✓ All containers removed!"
      read -p "Press Enter to continue..."
      ;;
    6)
      echo "Running containers:"
      docker ps
      echo ""
      read -p "Press Enter to continue..."
      ;;
    7)
      echo "Docker images:"
      docker images
      echo ""
      read -p "Press Enter to continue..."
      ;;
    8)
      echo "Container details:"
      docker-compose ps
      echo ""
      read -p "Press Enter to continue..."
      ;;
    9)
      echo "Deploying to VPS..."
      read -p "Enter VPS IP (default: 187.124.97.56): " vps_ip
      vps_ip=${vps_ip:-187.124.97.56}
      
      echo "Building images..."
      docker-compose build
      
      echo ""
      echo "To deploy to VPS, run these commands on the VPS:"
      echo ""
      echo "ssh root@$vps_ip"
      echo "cd /root/lms"
      echo "git pull origin master"
      echo "docker-compose build"
      echo "docker-compose up -d"
      echo ""
      read -p "Press Enter to continue..."
      ;;
    10)
      echo "Exiting..."
      exit 0
      ;;
    *)
      echo "Invalid choice!"
      read -p "Press Enter to continue..."
      ;;
  esac
done
