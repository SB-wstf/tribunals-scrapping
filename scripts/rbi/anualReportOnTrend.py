from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from pymongo import MongoClient
import time



client = MongoClient("mongodb+srv://deepakkumar:M92xjniipmDT8rtK@cluster0.z2d9d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")

db = client['stale']
collection = db['rbi']

driver = webdriver.Chrome()
driver.maximize_window()

url = 'https://rbi.org.in/Scripts/AnnualPublications.aspx?head=Trend%20and%20Progress%20of%20Banking%20in%20India'
driver.get(url)
time.sleep(5)

years = [str(year) for year in range(2024, 1996, -1)]

year_ids = []
for year in years:
    try:
        element = driver.find_element(By.XPATH, f"//*[@id='{year}']")
        year_ids.append(element.get_attribute('id'))
    except:
        print(f"Year {year} not found on the page")

year_ids

archives = year_ids[11:]

def get_archive_button(driver):
    archive_button = driver.find_element(By.XPATH, '//*[@id="divArchiveMain"]')
    archive_button.click()
    time.sleep(2)
get_archive_button(driver)

def scrape_trend_for_year(driver):
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    pdf_data = []

    for row in soup.find_all('tr'):
        
        title_td = row.find('td', style='word-wrap:break-word;width:2000;')
        if title_td:
            title = title_td.text.strip()
            link_td = row.find('td', nowrap=True).find_next('td', nowrap=True)
            if link_td:
                pdf_link_tag = link_td.find('a', href=True)
                if pdf_link_tag and pdf_link_tag['href'].endswith(('.PDF', '.pdf')):
                    pdf_data.append({
                        'title': title,
                        'link': pdf_link_tag['href']
                    })

    return pdf_data

trend_report = []
for year_id in year_ids:
    if year_id in archives:
        get_archive_button(driver)
        
    year_button = driver.find_element(By.ID, year_id)
    year_button.click()
    time.sleep(2)  

    # all_months_button_id = year_id[3:] + '0'
    
    # all_months_button = driver.find_element(By.XPATH, f'//*[@id="{all_months_button_id}"]')
    # all_months_button.click()
    # time.sleep(3)

    get_archive_button(driver)
    
    pdf_links = scrape_trend_for_year(driver)
    trend_report.append(pdf_links)
trend_report

driver.quit()

try:
    for year in trend_report:
        for item in year:
            document = {
                'tagString': 'Publications <-> Annual <-> Report on trend and progress of banking in India',  
                'title': item['title'],
                'pdfUrls': [item['link']]
            }
            try:
                print(document)
                collection.insert_one(document)
            except Exception as e:
                print(f"Error inserting document: {e}")
                print(f"Duplicate document: {document}")

except Exception as ex:
    print(f"Error during insertion loop: {ex}")
    
    