# import schedule
import time,sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from pymongo import MongoClient

# MongoDB setup
client = MongoClient(sys.argv[1])
db = client['stale']
collection = db['rbi']

# scrape_notifications_for_year
def scrape_notifications_for_year(driver):
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    pdf_links = []
    pdf_titles = []

    for link in soup.find_all('a', class_='link2', href=True):
        title = link.text.strip().replace('  ', ' ')
        pdf_titles.append(title)
        
    for link in soup.find_all('a', href=True):
        if link['href'].endswith('.PDF') or link['href'].endswith('.pdf'):
            img = link.find('img', src=True)
            if img and 'pdf' in img['src'].lower():
                pdf_links.append(link['href'])
    
    all_pdf_links = []
    for link, title in zip(pdf_links, pdf_titles):
        all_pdf_links.append({
            'link': link,
            'title': title
        })
    
    return all_pdf_links

# archives_buttons
def get_archive_button(driver):
    archive_button = driver.find_element(By.XPATH, '//*[@id="divArchiveMain"]')
    archive_button.click()
    time.sleep(2)

# Function to run the scraping task
def run_scraping():
    driver = webdriver.Chrome()
    driver.maximize_window()

    url = 'https://www.rbi.org.in/Scripts/AnnualReportPublications.aspx?year=2024'
    driver.get(url)
    time.sleep(5)

    years = [str(year) for year in range(2024, 1997, -1)]
    year_ids = []

    for year in years:
        try:
            element = driver.find_element(By.XPATH, f"//*[@id='{year}']")
            year_ids.append(element.get_attribute('id'))
        except:
            print(f"Year {year} not found on the page")

    archives = year_ids[11:]  # Adjust this to match the structure of the webpage
    
    existing_count = 0  # Counter for existing documents
    MAX_EXISTING_COUNT = 3  # Maximum allowed existing documents

    for year_id in year_ids:
        if existing_count >= MAX_EXISTING_COUNT:
            print("Reached max existing count, stopping scraper.")
            break

        if year_id in archives:
            get_archive_button(driver)
            
        year_button = driver.find_element(By.ID, year_id)
        year_button.click()
        time.sleep(2)

        # Scrape PDF links for the current year
        pdf_links = scrape_notifications_for_year(driver)

        # Process and insert documents into MongoDB one by one
        for item in pdf_links:
            document = {
                'tagString': 'Publications <-> Annual <-> Annual Report Of RBI',  
                'title': item['title'],
                'pdfUrls': [item['link']]
            }

            # Check if the document already exists
            existing_doc = collection.find_one({'title': item['title']})

            if existing_doc:
                # Increment the count if document already exists
                existing_count += 1
                print(f"Document already exists: {item['title']} (Existing count: {existing_count})")
                if existing_count >= MAX_EXISTING_COUNT:
                    print("Max existing documents found, stopping for today.")
                    driver.quit()
                    return  # Stop the scraper if the existing count reaches 3
            else:
                # Insert the new document into MongoDB
                try:
                    collection.insert_one(document)
                    print(f"Inserted new document: {document['title']}")
                except Exception as e:
                    print(f"Error inserting document: {e}")
    
    driver.quit()
