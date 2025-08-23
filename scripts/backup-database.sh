#!/bin/bash

# =====================================================
# Database Backup Script for Quiz Time Deferral Project
# Phase 0.3: Safety & Backup
# =====================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_NAME="quiz_backup_${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Quiz Time Deferral - Database Backup Tool   ${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please ensure you're running this from the project root"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Parse DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo -e "${YELLOW}Database Details:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Function to perform backup
perform_backup() {
    echo -e "${YELLOW}Starting backup...${NC}"
    
    # Full database backup
    PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        --verbose \
        --format=custom \
        --file="${BACKUP_DIR}/${BACKUP_NAME}.dump" \
        2>&1 | while read line; do
            echo "  $line"
        done
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database backup completed successfully${NC}"
        echo "  Location: ${BACKUP_DIR}/${BACKUP_NAME}.dump"
        
        # Also create a SQL text backup for easy inspection
        echo -e "${YELLOW}Creating SQL text backup...${NC}"
        PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
        pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
            --verbose \
            --format=plain \
            --file="${BACKUP_DIR}/${BACKUP_NAME}.sql" \
            2>&1 | while read line; do
                echo "  $line"
            done
            
        echo -e "${GREEN}✓ SQL backup created${NC}"
        echo "  Location: ${BACKUP_DIR}/${BACKUP_NAME}.sql"
    else
        echo -e "${RED}✗ Backup failed${NC}"
        exit 1
    fi
}

# Function to backup specific tables
backup_quiz_tables() {
    echo ""
    echo -e "${YELLOW}Backing up quiz-related tables...${NC}"
    
    TABLES="quizzes questions enrollments quiz_attempts quiz_share_links group_enrollments"
    
    for TABLE in $TABLES; do
        echo "  Backing up table: $TABLE"
        PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
        pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
            --table=$TABLE \
            --format=plain \
            --file="${BACKUP_DIR}/${BACKUP_NAME}_${TABLE}.sql" \
            2>/dev/null
            
        if [ $? -eq 0 ]; then
            echo -e "    ${GREEN}✓${NC} $TABLE backed up"
        else
            echo -e "    ${RED}✗${NC} Failed to backup $TABLE"
        fi
    done
}

# Function to create backup metadata
create_metadata() {
    echo ""
    echo -e "${YELLOW}Creating backup metadata...${NC}"
    
    cat > "${BACKUP_DIR}/${BACKUP_NAME}_metadata.json" << EOF
{
    "timestamp": "${TIMESTAMP}",
    "date": "$(date)",
    "project": "Quiz Time Deferral",
    "phase": "Phase 0.3",
    "database": "${DB_NAME}",
    "host": "${DB_HOST}",
    "backup_files": [
        "${BACKUP_NAME}.dump",
        "${BACKUP_NAME}.sql"
    ],
    "restore_command": "pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} ${BACKUP_NAME}.dump",
    "notes": "Backup created before implementing quiz time deferral feature"
}
EOF
    
    echo -e "${GREEN}✓ Metadata created${NC}"
}

# Function to verify backup
verify_backup() {
    echo ""
    echo -e "${YELLOW}Verifying backup...${NC}"
    
    # Check file sizes
    DUMP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.dump" | cut -f1)
    SQL_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.sql" | cut -f1)
    
    echo "  Dump file size: $DUMP_SIZE"
    echo "  SQL file size: $SQL_SIZE"
    
    # Count tables in SQL backup
    TABLE_COUNT=$(grep -c "CREATE TABLE" "${BACKUP_DIR}/${BACKUP_NAME}.sql")
    echo "  Tables backed up: $TABLE_COUNT"
    
    echo -e "${GREEN}✓ Backup verification complete${NC}"
}

# Main execution
echo -e "${YELLOW}Choose backup type:${NC}"
echo "  1) Full database backup (recommended)"
echo "  2) Quiz tables only"
echo "  3) Both"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        perform_backup
        ;;
    2)
        backup_quiz_tables
        ;;
    3)
        perform_backup
        backup_quiz_tables
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

create_metadata
verify_backup

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}            Backup Complete!                   ${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Backup location: ${BACKUP_DIR}/"
echo "Backup prefix: ${BACKUP_NAME}"
echo ""
echo -e "${YELLOW}To restore from this backup:${NC}"
echo "  pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME ${BACKUP_DIR}/${BACKUP_NAME}.dump"
echo ""
echo -e "${YELLOW}Keep this backup safe until the project is complete!${NC}"